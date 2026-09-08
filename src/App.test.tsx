import { render, screen, fireEvent, act, within } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import App from './App';
import {
  expireStaleMyDayTasks,
  STORAGE_KEY_SOUND_ENABLED,
  STORAGE_KEY_TASKS,
  STORAGE_KEY_LISTS,
} from './context/TodoContext';
import {
  resetAudioContext,
  ROOT_CHIME_FREQUENCY,
  OCTAVE_CHIME_FREQUENCY,
  HAPTIC_FEEDBACK_PATTERN,
} from './utils/sensory';
import {
  validateBackupData,
  parseAndValidateBackup,
  createBackupPayload,
  ensureSystemLists,
} from './utils/backup';
import {
  getStepProgress,
  formatDueDateBadge,
  type Task,
} from './types/todo';

describe('App Component Integration Tests', () => {
  let originalInnerWidth: number;

  beforeEach(() => {
    localStorage.clear();
    originalInnerWidth = typeof window !== 'undefined' ? window.innerWidth : 1024;
    vi.restoreAllMocks();
  });

  afterEach(() => {
    if (typeof window !== 'undefined') {
      window.innerWidth = originalInnerWidth;
    }
  });

  it('renders phone mockup container and QR code on desktop viewports (> 768px)', () => {
    window.innerWidth = 1024;
    render(<App />);

    expect(screen.getByTestId('desktop-guard')).toBeInTheDocument();
    expect(screen.getByTestId('phone-mockup')).toBeInTheDocument();
    expect(screen.getByTestId('qr-code')).toBeInTheDocument();
    expect(screen.getByTestId('mobile-shell')).toBeInTheDocument();
    expect(screen.getByText(/Microsoft To Do/i)).toBeInTheDocument();
  });

  it('renders full-bleed mobile shell without phone mockup or QR code on mobile viewports (<= 768px)', () => {
    window.innerWidth = 375;
    render(<App />);

    expect(screen.getByTestId('mobile-shell')).toBeInTheDocument();
    expect(screen.queryByTestId('phone-mockup')).not.toBeInTheDocument();
    expect(screen.queryByTestId('desktop-guard')).not.toBeInTheDocument();
    expect(screen.queryByTestId('qr-code')).not.toBeInTheDocument();
  });

  it('handles window resize dynamically between desktop and mobile viewports', () => {
    window.innerWidth = 1024;
    render(<App />);

    expect(screen.getByTestId('phone-mockup')).toBeInTheDocument();

    act(() => {
      window.innerWidth = 500;
      window.dispatchEvent(new Event('resize'));
    });

    expect(screen.queryByTestId('phone-mockup')).not.toBeInTheDocument();
    expect(screen.getByTestId('mobile-shell')).toBeInTheDocument();

    act(() => {
      window.innerWidth = 1200;
      window.dispatchEvent(new Event('resize'));
    });

    expect(screen.getByTestId('phone-mockup')).toBeInTheDocument();
  });

  it('allows copying current page URL from QR code card', async () => {
    window.innerWidth = 1024;
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    const originalClipboard = navigator.clipboard;
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    try {
      render(<App />);

      const copyBtn = screen.getByTestId('copy-url-btn');
      expect(copyBtn).toBeInTheDocument();

      await act(async () => {
        fireEvent.click(copyBtn);
      });

      expect(writeTextMock).toHaveBeenCalled();
      expect(screen.getByText(/Copied!/i)).toBeInTheDocument();
    } finally {
      Object.assign(navigator, { clipboard: originalClipboard });
    }
  });

  describe("Default 'Tasks' List & LocalStorage CRUD", () => {
    beforeEach(() => {
      window.innerWidth = 375;
      localStorage.clear();
    });

    it("displays default 'Tasks' list header and preloaded demo tasks", () => {
      render(<App />);

      expect(screen.getByRole('heading', { level: 1, name: /Tasks/i })).toBeInTheDocument();
      expect(screen.getByText('Welcome to Tasks!')).toBeInTheDocument();
      expect(screen.getByText('Try adding a new task below')).toBeInTheDocument();
      expect(screen.getByText('Tap the circle to mark a task complete')).toBeInTheDocument();
    });

    it('allows user to type a task title and add it to the list', () => {
      render(<App />);

      const input = screen.getByPlaceholderText('Add a task');
      const submitBtn = screen.getByRole('button', { name: /Add task/i });

      fireEvent.change(input, { target: { value: 'Buy groceries' } });
      fireEvent.click(submitBtn);

      expect(screen.getByText('Buy groceries')).toBeInTheDocument();
      expect(input).toHaveValue('');
    });

    it('ignores empty or whitespace-only task submission', () => {
      render(<App />);

      const initialItems = screen.getAllByRole('checkbox');
      const count = initialItems.length;

      const input = screen.getByPlaceholderText('Add a task');
      fireEvent.change(input, { target: { value: '   ' } });
      fireEvent.submit(input.closest('form')!);

      expect(screen.getAllByRole('checkbox')).toHaveLength(count);
    });

    it('allows user to check and uncheck task completion status', () => {
      render(<App />);

      const taskCheckbox = screen.getByRole('checkbox', {
        name: 'Try adding a new task below',
      });
      expect(taskCheckbox).not.toBeChecked();

      // Toggle to complete
      fireEvent.click(taskCheckbox);
      const completedCheckbox = screen.getByRole('checkbox', {
        name: 'Try adding a new task below',
      });
      expect(completedCheckbox).toBeChecked();

      // Toggle back to uncomplete
      fireEvent.click(completedCheckbox);
      expect(
        screen.getByRole('checkbox', {
          name: 'Try adding a new task below',
        })
      ).not.toBeChecked();
    });

    it('allows user to delete a task from the list', () => {
      render(<App />);

      expect(screen.getByText('Try adding a new task below')).toBeInTheDocument();

      const deleteBtn = screen.getByRole('button', {
        name: 'Delete task "Try adding a new task below"',
      });
      fireEvent.click(deleteBtn);

      expect(screen.queryByText('Try adding a new task below')).not.toBeInTheDocument();
    });

    it('persists tasks and completion statuses across simulated browser refreshes in localStorage', () => {
      const { unmount } = render(<App />);

      // Add a custom task
      const input = screen.getByPlaceholderText('Add a task');
      fireEvent.change(input, { target: { value: 'Persisted Task' } });
      fireEvent.submit(input.closest('form')!);

      expect(screen.getByText('Persisted Task')).toBeInTheDocument();

      // Complete the newly created task
      const persistedCheckbox = screen.getByRole('checkbox', {
        name: 'Persisted Task',
      });
      fireEvent.click(persistedCheckbox);
      expect(
        screen.getByRole('checkbox', { name: 'Persisted Task' })
      ).toBeChecked();

      // Delete an existing task
      const deleteBtn = screen.getByRole('button', {
        name: 'Delete task "Try adding a new task below"',
      });
      fireEvent.click(deleteBtn);
      expect(screen.queryByText('Try adding a new task below')).not.toBeInTheDocument();

      // Simulate refresh by unmounting and re-rendering App
      unmount();
      render(<App />);

      // Verify persisted state
      expect(screen.getByText('Persisted Task')).toBeInTheDocument();
      expect(
        screen.getByRole('checkbox', { name: 'Persisted Task' })
      ).toBeChecked();
      expect(
        screen.queryByText('Try adding a new task below')
      ).not.toBeInTheDocument();
    });

    it('preserves an empty list without resetting to defaults when all tasks are deleted', () => {
      const { unmount } = render(<App />);

      // Delete all tasks
      const deleteButtons = screen.getAllByRole('button', { name: /^Delete task/i });
      deleteButtons.forEach((btn) => fireEvent.click(btn));

      expect(screen.getByText('No tasks yet')).toBeInTheDocument();

      // Simulate refresh
      unmount();
      render(<App />);

      expect(screen.getByText('No tasks yet')).toBeInTheDocument();
      expect(screen.queryByText('Welcome to Tasks!')).not.toBeInTheDocument();
    });

    it('handles malformed localStorage JSON gracefully by falling back to demo tasks', () => {
      localStorage.setItem('todo_tasks', '{ invalid json ');
      render(<App />);

      expect(screen.getByText('Welcome to Tasks!')).toBeInTheDocument();
    });
  });

  describe('Slide-Over Navigation Drawer & List Switching', () => {
    beforeEach(() => {
      window.innerWidth = 375;
      localStorage.clear();
    });

    it('opens navigation drawer when hamburger menu button is clicked', () => {
      render(<App />);

      expect(screen.queryByTestId('navigation-drawer')).not.toBeInTheDocument();
      const menuButton = screen.getByRole('button', { name: /open navigation menu/i });
      fireEvent.click(menuButton);

      expect(screen.getByTestId('navigation-drawer')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /close navigation drawer/i })).toBeInTheDocument();
    });

    it('displays available lists with their active task counts', () => {
      render(<App />);

      fireEvent.click(screen.getByRole('button', { name: /open navigation menu/i }));

      const drawer = screen.getByTestId('navigation-drawer');
      expect(drawer).toBeInTheDocument();
      expect(screen.getByTestId('list-item-tasks')).toHaveTextContent('Tasks');
      expect(screen.getByTestId('list-count-tasks')).toHaveTextContent('2');
      expect(screen.getByTestId('list-item-personal')).toHaveTextContent('Personal');
      expect(screen.getByTestId('list-count-personal')).toHaveTextContent('1');
      expect(screen.getByTestId('list-item-work')).toHaveTextContent('Work');
      expect(screen.getByTestId('list-count-work')).toHaveTextContent('1');
    });

    it('switches active list when tapping a list and closes the drawer', () => {
      render(<App />);

      // Initial state shows Tasks
      expect(screen.getByRole('heading', { level: 1, name: /Tasks/i })).toBeInTheDocument();
      expect(screen.getByText('Welcome to Tasks!')).toBeInTheDocument();

      // Open drawer
      fireEvent.click(screen.getByRole('button', { name: /open navigation menu/i }));

      // Tap 'Personal' list
      const personalListItem = screen.getByTestId('list-item-personal');
      fireEvent.click(personalListItem);

      // Drawer should be dismissed
      expect(screen.queryByTestId('navigation-drawer')).not.toBeInTheDocument();

      // Active list view header and tasks should update to Personal
      expect(screen.getByRole('heading', { level: 1, name: /Personal/i })).toBeInTheDocument();
      expect(screen.getByText('Plan weekend trip')).toBeInTheDocument();
      expect(screen.queryByText('Welcome to Tasks!')).not.toBeInTheDocument();
    });

    it('dismisses drawer when tapping the backdrop', () => {
      render(<App />);

      fireEvent.click(screen.getByRole('button', { name: /open navigation menu/i }));
      expect(screen.getByTestId('navigation-drawer')).toBeInTheDocument();

      const backdrop = screen.getByTestId('drawer-backdrop');
      fireEvent.click(backdrop);

      expect(screen.queryByTestId('navigation-drawer')).not.toBeInTheDocument();
    });

    it('dismisses drawer when tapping the close button', () => {
      render(<App />);

      fireEvent.click(screen.getByRole('button', { name: /open navigation menu/i }));
      expect(screen.getByTestId('navigation-drawer')).toBeInTheDocument();

      const closeBtn = screen.getByRole('button', { name: /close navigation drawer/i });
      fireEvent.click(closeBtn);

      expect(screen.queryByTestId('navigation-drawer')).not.toBeInTheDocument();
    });

    it('scopes newly added tasks to the active switched list and updates counts', () => {
      render(<App />);

      // Switch to Personal
      fireEvent.click(screen.getByRole('button', { name: /open navigation menu/i }));
      fireEvent.click(screen.getByTestId('list-item-personal'));

      // Add a task in Personal
      const input = screen.getByPlaceholderText('Add a task');
      fireEvent.change(input, { target: { value: 'Buy birthday gift' } });
      fireEvent.submit(input.closest('form')!);

      expect(screen.getByText('Buy birthday gift')).toBeInTheDocument();

      // Open drawer and verify Personal count updated to 2
      fireEvent.click(screen.getByRole('button', { name: /open navigation menu/i }));
      expect(screen.getByTestId('list-count-personal')).toHaveTextContent('2');
      expect(screen.getByTestId('list-count-tasks')).toHaveTextContent('2');

      // Switch back to Tasks and verify 'Buy birthday gift' is not in Tasks list
      fireEvent.click(screen.getByTestId('list-item-tasks'));
      expect(screen.getByRole('heading', { level: 1, name: /Tasks/i })).toBeInTheDocument();
      expect(screen.queryByText('Buy birthday gift')).not.toBeInTheDocument();
      expect(screen.getByText('Welcome to Tasks!')).toBeInTheDocument();
    });

    it('dismisses drawer when Escape key is pressed', () => {
      render(<App />);

      fireEvent.click(screen.getByRole('button', { name: /open navigation menu/i }));
      expect(screen.getByTestId('navigation-drawer')).toBeInTheDocument();

      fireEvent.keyDown(window, { key: 'Escape' });

      expect(screen.queryByTestId('navigation-drawer')).not.toBeInTheDocument();
    });

    it('decrements active task count in drawer when a task is completed', () => {
      render(<App />);

      // Tasks initially has 2 active tasks
      fireEvent.click(screen.getByRole('button', { name: /open navigation menu/i }));
      expect(screen.getByTestId('list-count-tasks')).toHaveTextContent('2');

      // Close drawer
      fireEvent.click(screen.getByRole('button', { name: /close navigation drawer/i }));

      // Complete one active task in Tasks
      const taskCheckbox = screen.getByRole('checkbox', {
        name: 'Welcome to Tasks!',
      });
      fireEvent.click(taskCheckbox);
      expect(
        screen.getByRole('checkbox', { name: 'Welcome to Tasks!' })
      ).toBeChecked();

      // Open drawer again and verify Tasks active count is now 1
      fireEvent.click(screen.getByRole('button', { name: /open navigation menu/i }));
      expect(screen.getByTestId('list-count-tasks')).toHaveTextContent('1');
    });
  });

  describe('Custom Lists with Emojis & Color Themes (Issue #5)', () => {
    beforeEach(() => {
      window.innerWidth = 375;
      localStorage.clear();
    });

    it("opens list creation dialog when '+ New List' button in drawer is clicked", () => {
      render(<App />);

      fireEvent.click(screen.getByRole('button', { name: /open navigation menu/i }));
      const addListBtn = screen.getByTestId('add-list-btn');
      expect(addListBtn).toBeInTheDocument();

      fireEvent.click(addListBtn);

      expect(screen.getByTestId('list-modal')).toBeInTheDocument();
      expect(screen.getByTestId('list-modal-title')).toHaveTextContent('New List');
      expect(screen.getByTestId('list-title-input')).toBeInTheDocument();
      expect(screen.getByTestId('save-list-btn')).toBeInTheDocument();
      expect(screen.getByTestId('cancel-list-btn')).toBeInTheDocument();
    });

    it('creates a custom list with custom title, emoji icon, and color theme, and switches to it', () => {
      render(<App />);

      fireEvent.click(screen.getByRole('button', { name: /open navigation menu/i }));
      fireEvent.click(screen.getByTestId('add-list-btn'));

      // Enter list title
      fireEvent.change(screen.getByTestId('list-title-input'), {
        target: { value: 'Groceries' },
      });

      // Select emoji 🛒
      fireEvent.click(screen.getByTestId('emoji-option-🛒'));

      // Select color theme 'rose'
      fireEvent.click(screen.getByTestId('color-theme-rose'));

      // Submit
      fireEvent.click(screen.getByTestId('save-list-btn'));

      // Drawer and modal should both be dismissed
      expect(screen.queryByTestId('list-modal')).not.toBeInTheDocument();
      expect(screen.queryByTestId('navigation-drawer')).not.toBeInTheDocument();

      // Main header should display new list name, emoji, and theme styling
      const header = screen.getByTestId('mobile-shell-header');
      expect(header).toHaveAttribute('data-theme', 'rose');
      expect(header).toHaveTextContent('Groceries');
      expect(header).toHaveTextContent('🛒');

      // The new list is empty
      expect(screen.getByText('No tasks yet')).toBeInTheDocument();
    });

    it('updates active list view header theme styling and title based on selected custom list', () => {
      render(<App />);

      // Switch to Personal (theme purple)
      fireEvent.click(screen.getByRole('button', { name: /open navigation menu/i }));
      fireEvent.click(screen.getByTestId('list-item-personal'));

      const header = screen.getByTestId('mobile-shell-header');
      expect(header).toHaveAttribute('data-theme', 'purple');
      expect(screen.getByRole('heading', { level: 1, name: /Personal/i })).toBeInTheDocument();

      // Switch to Work (theme emerald)
      fireEvent.click(screen.getByRole('button', { name: /open navigation menu/i }));
      fireEvent.click(screen.getByTestId('list-item-work'));

      expect(screen.getByTestId('mobile-shell-header')).toHaveAttribute('data-theme', 'emerald');
      expect(screen.getByRole('heading', { level: 1, name: /Work/i })).toBeInTheDocument();
    });

    it('allows adding tasks to the newly created custom list', () => {
      render(<App />);

      // Create 'Shopping' list
      fireEvent.click(screen.getByRole('button', { name: /open navigation menu/i }));
      fireEvent.click(screen.getByTestId('add-list-btn'));
      fireEvent.change(screen.getByTestId('list-title-input'), {
        target: { value: 'Shopping' },
      });
      fireEvent.click(screen.getByTestId('save-list-btn'));

      // Add task
      const input = screen.getByPlaceholderText('Add a task');
      fireEvent.change(input, { target: { value: 'Organic apples' } });
      fireEvent.submit(input.closest('form')!);

      expect(screen.getByText('Organic apples')).toBeInTheDocument();

      // Check drawer count
      fireEvent.click(screen.getByRole('button', { name: /open navigation menu/i }));
      const drawer = screen.getByTestId('navigation-drawer');
      expect(drawer).toHaveTextContent('Shopping');
      // Switch back to Tasks, verify 'Organic apples' not in Tasks
      fireEvent.click(screen.getByTestId('list-item-tasks'));
      expect(screen.queryByText('Organic apples')).not.toBeInTheDocument();
    });

    it('allows editing custom list settings (title, emoji, color theme) and reflects changes in drawer and header', () => {
      render(<App />);

      // Open drawer
      fireEvent.click(screen.getByRole('button', { name: /open navigation menu/i }));

      // Edit 'personal' list
      const editBtn = screen.getByTestId('edit-list-personal');
      expect(editBtn).toBeInTheDocument();
      fireEvent.click(editBtn);

      expect(screen.getByTestId('list-modal')).toBeInTheDocument();
      expect(screen.getByTestId('list-modal-title')).toHaveTextContent('Edit List');
      expect(screen.getByTestId('list-title-input')).toHaveValue('Personal');

      // Change title, emoji, and color
      fireEvent.change(screen.getByTestId('list-title-input'), {
        target: { value: 'Home & Life' },
      });
      fireEvent.click(screen.getByTestId('emoji-option-🏠'));
      fireEvent.click(screen.getByTestId('color-theme-cyan'));

      // Save
      fireEvent.click(screen.getByTestId('save-list-btn'));
      expect(screen.queryByTestId('list-modal')).not.toBeInTheDocument();

      // Drawer list item should reflect new name
      expect(screen.getByText('Home & Life')).toBeInTheDocument();

      // Tap the edited list
      fireEvent.click(screen.getByTestId('list-item-personal'));

      // Header should reflect updated title, emoji, and theme
      const header = screen.getByTestId('mobile-shell-header');
      expect(header).toHaveAttribute('data-theme', 'cyan');
      expect(header).toHaveTextContent('Home & Life');
      expect(header).toHaveTextContent('🏠');
    });

    it('allows editing list settings via header more options menu', () => {
      render(<App />);

      // Switch to Personal
      fireEvent.click(screen.getByRole('button', { name: /open navigation menu/i }));
      fireEvent.click(screen.getByTestId('list-item-personal'));

      // Click more options
      fireEvent.click(screen.getByTestId('list-options-btn'));
      expect(screen.getByTestId('list-options-menu')).toBeInTheDocument();

      // Click Edit list settings
      fireEvent.click(screen.getByTestId('edit-list-menu-item'));
      expect(screen.getByTestId('list-modal')).toBeInTheDocument();

      fireEvent.change(screen.getByTestId('list-title-input'), {
        target: { value: 'Private' },
      });
      fireEvent.click(screen.getByTestId('save-list-btn'));

      expect(screen.getByTestId('mobile-shell-header')).toHaveTextContent('Private');
    });

    it('allows deleting a custom list and its tasks from edit modal', () => {
      render(<App />);

      // Verify Personal has task 'Plan weekend trip'
      fireEvent.click(screen.getByRole('button', { name: /open navigation menu/i }));
      expect(screen.getByTestId('list-item-personal')).toBeInTheDocument();
      fireEvent.click(screen.getByTestId('list-item-personal'));
      expect(screen.getByText('Plan weekend trip')).toBeInTheDocument();

      // Open drawer, edit Personal, and delete it
      fireEvent.click(screen.getByRole('button', { name: /open navigation menu/i }));
      fireEvent.click(screen.getByTestId('edit-list-personal'));
      const deleteBtn = screen.getByTestId('delete-list-btn');
      expect(deleteBtn).toBeInTheDocument();
      fireEvent.click(deleteBtn);

      // Verify modal closed
      expect(screen.queryByTestId('list-modal')).not.toBeInTheDocument();

      // Active list should fallback to Tasks
      expect(screen.getByTestId('mobile-shell-header')).toHaveTextContent('Tasks');

      // Open drawer and verify Personal is no longer in the list
      fireEvent.click(screen.getByRole('button', { name: /open navigation menu/i }));
      expect(screen.queryByTestId('list-item-personal')).not.toBeInTheDocument();

      // Verify Personal's tasks are deleted and do not appear in Tasks
      fireEvent.click(screen.getByRole('button', { name: /close navigation drawer/i }));
      expect(screen.queryByText('Plan weekend trip')).not.toBeInTheDocument();
    });

    it('allows deleting a custom list from header options menu and removes its tasks', () => {
      render(<App />);

      // Switch to Work
      fireEvent.click(screen.getByRole('button', { name: /open navigation menu/i }));
      fireEvent.click(screen.getByTestId('list-item-work'));
      expect(screen.getByText('Quarterly review presentation')).toBeInTheDocument();

      // Delete via header options menu
      fireEvent.click(screen.getByTestId('list-options-btn'));
      fireEvent.click(screen.getByTestId('delete-list-menu-item'));

      // Header should switch back to Tasks
      expect(screen.getByTestId('mobile-shell-header')).toHaveTextContent('Tasks');
      expect(screen.queryByText('Quarterly review presentation')).not.toBeInTheDocument();

      // Open drawer and verify Work is gone
      fireEvent.click(screen.getByRole('button', { name: /open navigation menu/i }));
      expect(screen.queryByTestId('list-item-work')).not.toBeInTheDocument();
    });

    it('disables more options menu and omits edit button for system Tasks list', () => {
      render(<App />);

      // On Tasks list, options button is disabled
      const optionsBtn = screen.getByTestId('list-options-btn');
      expect(optionsBtn).toBeDisabled();

      // In drawer, Tasks does not have an edit button
      fireEvent.click(screen.getByRole('button', { name: /open navigation menu/i }));
      expect(screen.queryByTestId('edit-list-tasks')).not.toBeInTheDocument();
    });

    it('persists newly created custom list across simulated page reload in localStorage', () => {
      const { unmount } = render(<App />);

      // Create custom list 'Travel'
      fireEvent.click(screen.getByRole('button', { name: /open navigation menu/i }));
      fireEvent.click(screen.getByTestId('add-list-btn'));
      fireEvent.change(screen.getByTestId('list-title-input'), {
        target: { value: 'Travel' },
      });
      fireEvent.click(screen.getByTestId('emoji-option-✈️'));
      fireEvent.click(screen.getByTestId('color-theme-amber'));
      fireEvent.click(screen.getByTestId('save-list-btn'));

      expect(screen.getByTestId('mobile-shell-header')).toHaveTextContent('Travel');

      // Simulate refresh
      unmount();
      render(<App />);

      // Open drawer and verify Travel is still there
      fireEvent.click(screen.getByRole('button', { name: /open navigation menu/i }));
      expect(screen.getByTestId('navigation-drawer')).toHaveTextContent('Travel');
    });
  });

  describe('Important Starred Smart List (Issue #6)', () => {
    beforeEach(() => {
      window.innerWidth = 375;
      localStorage.clear();
    });

    it('every task card displays an interactive star icon button with active/inactive state', () => {
      render(<App />);

      // Task 1 is preloaded as important/starred
      const starBtn1 = screen.getByTestId('star-task-task-1');
      expect(starBtn1).toBeInTheDocument();
      expect(starBtn1).toHaveAttribute('data-starred', 'true');
      expect(starBtn1).toHaveAttribute('aria-pressed', 'true');

      // Task 2 is preloaded as unstarred
      const starBtn2 = screen.getByTestId('star-task-task-2');
      expect(starBtn2).toBeInTheDocument();
      expect(starBtn2).toHaveAttribute('data-starred', 'false');
      expect(starBtn2).toHaveAttribute('aria-pressed', 'false');
    });

    it('tapping the star toggles task importance with visual active/inactive state', () => {
      render(<App />);

      const starBtn2 = screen.getByTestId('star-task-task-2');
      expect(starBtn2).toHaveAttribute('data-starred', 'false');

      // Click to star task-2
      fireEvent.click(starBtn2);
      expect(starBtn2).toHaveAttribute('data-starred', 'true');
      expect(starBtn2).toHaveAttribute('aria-pressed', 'true');

      // Click again to unstar
      fireEvent.click(starBtn2);
      expect(starBtn2).toHaveAttribute('data-starred', 'false');
      expect(starBtn2).toHaveAttribute('aria-pressed', 'false');
    });

    it('shows Important smart list in navigation drawer with real-time count of starred tasks', () => {
      render(<App />);

      // Initially, task-1 and task-5 are active & starred -> count is 2
      fireEvent.click(screen.getByRole('button', { name: /open navigation menu/i }));
      expect(screen.getByTestId('list-item-important')).toBeInTheDocument();
      expect(screen.getByTestId('list-count-important')).toHaveTextContent('2');

      // Close drawer
      fireEvent.click(screen.getByRole('button', { name: /close navigation drawer/i }));

      // Star task-2 in Tasks
      fireEvent.click(screen.getByTestId('star-task-task-2'));

      // Reopen drawer -> Important count should now be 3
      fireEvent.click(screen.getByRole('button', { name: /open navigation menu/i }));
      expect(screen.getByTestId('list-count-important')).toHaveTextContent('3');

      // Close drawer and complete a starred task (task-1)
      fireEvent.click(screen.getByRole('button', { name: /close navigation drawer/i }));
      const checkbox1 = screen.getByRole('checkbox', { name: 'Welcome to Tasks!' });
      fireEvent.click(checkbox1);

      // Reopen drawer -> active Important count should decrement to 2
      fireEvent.click(screen.getByRole('button', { name: /open navigation menu/i }));
      expect(screen.getByTestId('list-count-important')).toHaveTextContent('2');
    });

    it('opening Important shows all starred tasks regardless of parent list', () => {
      render(<App />);

      // Open drawer and switch to 'Important'
      fireEvent.click(screen.getByRole('button', { name: /open navigation menu/i }));
      fireEvent.click(screen.getByTestId('list-item-important'));

      // Header should display 'Important' with warm/rose theme
      const header = screen.getByTestId('mobile-shell-header');
      expect(header).toHaveTextContent('Important');
      expect(header).toHaveAttribute('data-theme', 'rose');

      // Should display starred task from 'tasks' list
      expect(screen.getByText('Welcome to Tasks!')).toBeInTheDocument();
      // Should display starred task from 'work' list
      expect(screen.getByText('Quarterly review presentation')).toBeInTheDocument();

      // Non-starred tasks should NOT be in Important
      expect(screen.queryByText('Try adding a new task below')).not.toBeInTheDocument();
      expect(screen.queryByText('Plan weekend trip')).not.toBeInTheDocument();
    });

    it('unstarring an item inside Important updates both Important and the items original list', () => {
      render(<App />);

      // Open Important list
      fireEvent.click(screen.getByRole('button', { name: /open navigation menu/i }));
      fireEvent.click(screen.getByTestId('list-item-important'));

      // Both starred tasks are visible
      expect(screen.getByText('Welcome to Tasks!')).toBeInTheDocument();
      expect(screen.getByText('Quarterly review presentation')).toBeInTheDocument();

      // Unstar 'Quarterly review presentation' (which belongs to 'work' list)
      const starBtnWorkTask = screen.getByTestId('star-task-task-5');
      fireEvent.click(starBtnWorkTask);

      // Task is immediately removed from Important list view
      expect(screen.queryByText('Quarterly review presentation')).not.toBeInTheDocument();
      expect(screen.getByText('Welcome to Tasks!')).toBeInTheDocument();

      // Verify drawer count for Important decreased to 1
      fireEvent.click(screen.getByRole('button', { name: /open navigation menu/i }));
      expect(screen.getByTestId('list-count-important')).toHaveTextContent('1');

      // Switch to Work list
      fireEvent.click(screen.getByTestId('list-item-work'));

      // Task is still present in its original list, but its star is now unstarred
      expect(screen.getByText('Quarterly review presentation')).toBeInTheDocument();
      const workTaskStar = screen.getByTestId('star-task-task-5');
      expect(workTaskStar).toHaveAttribute('data-starred', 'false');

      // Re-star it in Work list
      fireEvent.click(workTaskStar);
      expect(workTaskStar).toHaveAttribute('data-starred', 'true');

      // Switch back to Important -> task reappears
      fireEvent.click(screen.getByRole('button', { name: /open navigation menu/i }));
      expect(screen.getByTestId('list-count-important')).toHaveTextContent('2');
      fireEvent.click(screen.getByTestId('list-item-important'));
      expect(screen.getByText('Quarterly review presentation')).toBeInTheDocument();
    });

    it('allows adding a task directly from Important list and marks it important', () => {
      render(<App />);

      // Switch to Important
      fireEvent.click(screen.getByRole('button', { name: /open navigation menu/i }));
      fireEvent.click(screen.getByTestId('list-item-important'));

      // Quick-add a new task
      const input = screen.getByPlaceholderText('Add a task');
      fireEvent.change(input, { target: { value: 'Submit tax return' } });
      fireEvent.submit(input.closest('form')!);

      // Newly added task appears in Important list and is starred
      expect(screen.getByText('Submit tax return')).toBeInTheDocument();
      const newTaskItem = screen.getByText('Submit tax return').closest('li')!;
      const starBtn = within(newTaskItem).getByRole('button', { name: /star/i });
      expect(starBtn).toHaveAttribute('data-starred', 'true');

      // Open drawer and check Tasks list has the newly created task
      fireEvent.click(screen.getByRole('button', { name: /open navigation menu/i }));
      fireEvent.click(screen.getByTestId('list-item-tasks'));
      expect(screen.getByText('Submit tax return')).toBeInTheDocument();
    });

    it('disables more options menu and omits edit button for system Important list', () => {
      render(<App />);

      // Switch to Important
      fireEvent.click(screen.getByRole('button', { name: /open navigation menu/i }));
      fireEvent.click(screen.getByTestId('list-item-important'));

      // Header options button should be disabled for Important system list
      expect(screen.getByTestId('list-options-btn')).toBeDisabled();

      // In drawer, Important does not have an edit button
      fireEvent.click(screen.getByRole('button', { name: /open navigation menu/i }));
      expect(screen.queryByTestId('edit-list-important')).not.toBeInTheDocument();
    });

    it('persists starred task status across simulated page reload in localStorage', () => {
      const { unmount } = render(<App />);

      // Star 'Try adding a new task below'
      const starBtn = screen.getByTestId('star-task-task-2');
      fireEvent.click(starBtn);
      expect(starBtn).toHaveAttribute('data-starred', 'true');

      // Simulate refresh
      unmount();
      render(<App />);

      // Verify task-2 remains starred
      expect(screen.getByTestId('star-task-task-2')).toHaveAttribute('data-starred', 'true');

      // Open drawer and check Important count is 3
      fireEvent.click(screen.getByRole('button', { name: /open navigation menu/i }));
      expect(screen.getByTestId('list-count-important')).toHaveTextContent('3');

      // Open Important and verify task-2 is listed
      fireEvent.click(screen.getByTestId('list-item-important'));
      expect(screen.getByText('Try adding a new task below')).toBeInTheDocument();
    });
  });

  describe("'My Day' Daily Planning & Midnight Rollover (Issue #7)", () => {
    it("'My Day' smart list is available at the top of the drawer with sunrise/blue gradient styling", () => {
      render(<App />);

      // Open navigation drawer
      fireEvent.click(screen.getByRole('button', { name: /open navigation menu/i }));

      // 'My Day' smart list item exists
      const myDayItem = screen.getByTestId('list-item-my-day');
      expect(myDayItem).toBeInTheDocument();
      expect(myDayItem).toHaveTextContent('My Day');

      // Verify My Day is at the top of the drawer lists
      const drawer = screen.getByTestId('navigation-drawer');
      const allListItems = within(drawer).getAllByRole('button', { name: /^(My Day|Tasks|Important|Personal|Work)/i });
      expect(allListItems[0]).toHaveTextContent('My Day');

      // Switch to 'My Day'
      fireEvent.click(myDayItem);

      // Header displays 'My Day' with sunrise styling
      const header = screen.getByTestId('mobile-shell-header');
      expect(header).toHaveTextContent('My Day');
      expect(header).toHaveAttribute('data-theme', 'sunrise');
      expect(header.className).toContain('from-amber-500');
      expect(header.className).toContain('to-blue-600');

      // System list options button is disabled
      expect(screen.getByTestId('list-options-btn')).toBeDisabled();

      // In drawer, My Day does not have an edit button
      fireEvent.click(screen.getByRole('button', { name: /open navigation menu/i }));
      expect(screen.queryByTestId('edit-list-my-day')).not.toBeInTheDocument();
    });

    it('every task card displays an interactive My Day button with active/inactive state', () => {
      render(<App />);

      const myDayBtn1 = screen.getByTestId('my-day-task-task-1');
      const myDayBtn2 = screen.getByTestId('my-day-task-task-2');

      expect(myDayBtn1).toBeInTheDocument();
      expect(myDayBtn1).toHaveAttribute('data-my-day', 'false');
      expect(myDayBtn1).toHaveAttribute('aria-pressed', 'false');
      expect(myDayBtn1).toHaveAttribute('aria-label', expect.stringContaining('Add'));

      expect(myDayBtn2).toBeInTheDocument();
      expect(myDayBtn2).toHaveAttribute('data-my-day', 'false');
      expect(myDayBtn2).toHaveAttribute('aria-pressed', 'false');
    });

    it('tapping the My Day button toggles task in My Day with visual active/inactive state', () => {
      render(<App />);

      const myDayBtn2 = screen.getByTestId('my-day-task-task-2');
      expect(myDayBtn2).toHaveAttribute('data-my-day', 'false');

      // Click to add to My Day
      fireEvent.click(myDayBtn2);
      expect(myDayBtn2).toHaveAttribute('data-my-day', 'true');
      expect(myDayBtn2).toHaveAttribute('aria-pressed', 'true');
      expect(myDayBtn2).toHaveAttribute('aria-label', expect.stringContaining('Remove'));

      // Click again to remove from My Day
      fireEvent.click(myDayBtn2);
      expect(myDayBtn2).toHaveAttribute('data-my-day', 'false');
      expect(myDayBtn2).toHaveAttribute('aria-pressed', 'false');
    });

    it('shows My Day smart list in navigation drawer with real-time count of active tasks', () => {
      render(<App />);

      // Initially 0 tasks in My Day
      fireEvent.click(screen.getByRole('button', { name: /open navigation menu/i }));
      expect(screen.getByTestId('list-count-my-day')).toHaveTextContent('0');

      // Close drawer and add task-2 to My Day
      fireEvent.click(screen.getByRole('button', { name: /close navigation drawer/i }));
      fireEvent.click(screen.getByTestId('my-day-task-task-2'));

      // Reopen drawer -> count should be 1
      fireEvent.click(screen.getByRole('button', { name: /open navigation menu/i }));
      expect(screen.getByTestId('list-count-my-day')).toHaveTextContent('1');

      // Close drawer and add task-1 to My Day -> count becomes 2
      fireEvent.click(screen.getByRole('button', { name: /close navigation drawer/i }));
      fireEvent.click(screen.getByTestId('my-day-task-task-1'));

      fireEvent.click(screen.getByRole('button', { name: /open navigation menu/i }));
      expect(screen.getByTestId('list-count-my-day')).toHaveTextContent('2');

      // Complete task-1 -> active My Day count should decrement to 1
      fireEvent.click(screen.getByRole('button', { name: /close navigation drawer/i }));
      const checkbox1 = screen.getByRole('checkbox', { name: 'Welcome to Tasks!' });
      fireEvent.click(checkbox1);

      fireEvent.click(screen.getByRole('button', { name: /open navigation menu/i }));
      expect(screen.getByTestId('list-count-my-day')).toHaveTextContent('1');
    });

    it('opening My Day shows all tasks added to My Day regardless of parent list', () => {
      render(<App />);

      // Add task-1 from Tasks to My Day
      fireEvent.click(screen.getByTestId('my-day-task-task-1'));

      // Switch to Work list and add task-5 to My Day
      fireEvent.click(screen.getByRole('button', { name: /open navigation menu/i }));
      fireEvent.click(screen.getByTestId('list-item-work'));
      fireEvent.click(screen.getByTestId('my-day-task-task-5'));

      // Open drawer and switch to My Day
      fireEvent.click(screen.getByRole('button', { name: /open navigation menu/i }));
      fireEvent.click(screen.getByTestId('list-item-my-day'));

      // Both tasks from different parent lists appear in My Day
      expect(screen.getByText('Welcome to Tasks!')).toBeInTheDocument();
      expect(screen.getByText('Quarterly review presentation')).toBeInTheDocument();

      // Tasks not in My Day do not appear
      expect(screen.queryByText('Try adding a new task below')).not.toBeInTheDocument();
      expect(screen.queryByText('Plan weekend trip')).not.toBeInTheDocument();
    });

    it('removing a task from My Day inside My Day removes it while leaving it safely in its parent list', () => {
      render(<App />);

      // Switch to Work list and add task-5 to My Day
      fireEvent.click(screen.getByRole('button', { name: /open navigation menu/i }));
      fireEvent.click(screen.getByTestId('list-item-work'));
      fireEvent.click(screen.getByTestId('my-day-task-task-5'));

      // Open My Day
      fireEvent.click(screen.getByRole('button', { name: /open navigation menu/i }));
      fireEvent.click(screen.getByTestId('list-item-my-day'));
      expect(screen.getByText('Quarterly review presentation')).toBeInTheDocument();

      // Remove from My Day by clicking the Sun button
      const myDayBtnWorkTask = screen.getByTestId('my-day-task-task-5');
      fireEvent.click(myDayBtnWorkTask);

      // Task is immediately removed from My Day view
      expect(screen.queryByText('Quarterly review presentation')).not.toBeInTheDocument();

      // Verify drawer count for My Day is 0
      fireEvent.click(screen.getByRole('button', { name: /open navigation menu/i }));
      expect(screen.getByTestId('list-count-my-day')).toHaveTextContent('0');

      // Switch to Work list -> task is still safely present in parent list!
      fireEvent.click(screen.getByTestId('list-item-work'));
      expect(screen.getByText('Quarterly review presentation')).toBeInTheDocument();
      expect(screen.getByTestId('my-day-task-task-5')).toHaveAttribute('data-my-day', 'false');
    });

    it('allows adding a task directly from My Day list, marking it in My Day and assigning safely to Tasks', () => {
      render(<App />);

      // Switch to My Day
      fireEvent.click(screen.getByRole('button', { name: /open navigation menu/i }));
      fireEvent.click(screen.getByTestId('list-item-my-day'));

      // Quick-add a new task in My Day
      const input = screen.getByPlaceholderText('Add a task');
      fireEvent.change(input, { target: { value: 'Prepare morning smoothie' } });
      fireEvent.submit(input.closest('form')!);

      // Newly added task appears in My Day list and is active in My Day
      expect(screen.getByText('Prepare morning smoothie')).toBeInTheDocument();
      const newTaskItem = screen.getByText('Prepare morning smoothie').closest('li')!;
      const sunBtn = within(newTaskItem).getByRole('button', { name: /remove.*from my day/i });
      expect(sunBtn).toHaveAttribute('data-my-day', 'true');

      // Open drawer and switch to Tasks -> task safely exists in parent Tasks list
      fireEvent.click(screen.getByRole('button', { name: /open navigation menu/i }));
      fireEvent.click(screen.getByTestId('list-item-tasks'));
      expect(screen.getByText('Prepare morning smoothie')).toBeInTheDocument();
    });

    it('midnight rollover check automatically clears past-midnight tasks out of My Day and preserves parent lists', () => {
      // Seed localStorage with a task in My Day having yesterday's date
      const yesterdayDate = '2026-09-01';
      const seededTasks = [
        {
          id: 'task-yesterday',
          title: 'Yesterday priority task',
          completed: false,
          isImportant: false,
          inMyDay: true,
          myDayDate: yesterdayDate,
          listId: 'tasks',
          createdAt: '2026-09-01T08:00:00.000Z',
        },
      ];
      localStorage.setItem('todo_tasks', JSON.stringify(seededTasks));

      // Render App - midnight rollover check runs upon load
      render(<App />);

      // Switch to My Day
      fireEvent.click(screen.getByRole('button', { name: /open navigation menu/i }));
      expect(screen.getByTestId('list-count-my-day')).toHaveTextContent('0');
      fireEvent.click(screen.getByTestId('list-item-my-day'));

      // 'Yesterday priority task' has dropped out of My Day
      expect(screen.queryByText('Yesterday priority task')).not.toBeInTheDocument();

      // Switch to parent list 'Tasks'
      fireEvent.click(screen.getByRole('button', { name: /open navigation menu/i }));
      fireEvent.click(screen.getByTestId('list-item-tasks'));

      // Task is safely preserved in its parent list!
      expect(screen.getByText('Yesterday priority task')).toBeInTheDocument();
      expect(screen.getByTestId('my-day-task-task-yesterday')).toHaveAttribute('data-my-day', 'false');

      // Check localStorage to confirm rollover was persisted
      const storedTasks = JSON.parse(localStorage.getItem('todo_tasks') || '[]');
      const rolledOverTask = storedTasks.find((t: { id: string }) => t.id === 'task-yesterday');
      expect(rolledOverTask.inMyDay).toBe(false);
      expect(rolledOverTask.myDayDate).toBeNull();
    });

    it('persists My Day task status across simulated page reload in localStorage', () => {
      const { unmount } = render(<App />);

      // Add 'Try adding a new task below' to My Day
      const myDayBtn = screen.getByTestId('my-day-task-task-2');
      fireEvent.click(myDayBtn);
      expect(myDayBtn).toHaveAttribute('data-my-day', 'true');

      // Simulate browser refresh
      unmount();
      render(<App />);

      // Verify task-2 remains in My Day
      expect(screen.getByTestId('my-day-task-task-2')).toHaveAttribute('data-my-day', 'true');

      // Open drawer and check My Day count is 1
      fireEvent.click(screen.getByRole('button', { name: /open navigation menu/i }));
      expect(screen.getByTestId('list-count-my-day')).toHaveTextContent('1');

      // Open My Day and verify task-2 is listed
      fireEvent.click(screen.getByTestId('list-item-my-day'));
      expect(screen.getByText('Try adding a new task below')).toBeInTheDocument();
    });

    it('expireStaleMyDayTasks clears past-midnight and dateless tasks while preserving parent lists', () => {
      const tasks: Task[] = [
        {
          id: '1',
          title: 'Past task',
          completed: false,
          inMyDay: true,
          myDayDate: '2026-08-30',
          listId: 'tasks',
          createdAt: new Date().toISOString(),
        },
        {
          id: '2',
          title: 'Dateless task',
          completed: false,
          inMyDay: true,
          myDayDate: null,
          listId: 'tasks',
          createdAt: new Date().toISOString(),
        },
        {
          id: '3',
          title: 'Today task',
          completed: false,
          inMyDay: true,
          myDayDate: '2026-09-08',
          listId: 'tasks',
          createdAt: new Date().toISOString(),
        },
      ];

      const { tasks: expired, changed } = expireStaleMyDayTasks(tasks, '2026-09-08');
      expect(changed).toBe(true);
      expect(expired[0].inMyDay).toBe(false);
      expect(expired[0].myDayDate).toBeNull();
      expect(expired[1].inMyDay).toBe(false);
      expect(expired[1].myDayDate).toBeNull();
      expect(expired[2].inMyDay).toBe(true);
      expect(expired[2].myDayDate).toBe('2026-09-08');

      // Subsequent call when all are fresh reports changed = false
      const rerun = expireStaleMyDayTasks(expired, '2026-09-08');
      expect(rerun.changed).toBe(false);
    });
  });

  describe('Task Detail View & Subtasks (Steps) (Issue #8)', () => {
    it('tapping a task in the list opens the detail view with back button navigation', () => {
      render(<App />);

      // Tap on the first task ('Welcome to Tasks!')
      fireEvent.click(screen.getByText('Welcome to Tasks!'));

      // Detail view is displayed
      const detailView = screen.getByTestId('task-detail-view');
      expect(detailView).toBeInTheDocument();
      expect(screen.getByTestId('detail-back-btn')).toBeInTheDocument();
      expect(screen.getByTestId('detail-task-title')).toHaveTextContent('Welcome to Tasks!');

      // Click the back button
      fireEvent.click(screen.getByTestId('detail-back-btn'));

      // Detail view closes
      expect(screen.queryByTestId('task-detail-view')).not.toBeInTheDocument();
      expect(screen.getByTestId('task-list')).toBeInTheDocument();
    });

    it('pressing Escape key dismisses the detail view', () => {
      render(<App />);

      fireEvent.click(screen.getByText('Welcome to Tasks!'));
      expect(screen.getByTestId('task-detail-view')).toBeInTheDocument();

      fireEvent.keyDown(window, { key: 'Escape' });
      expect(screen.queryByTestId('task-detail-view')).not.toBeInTheDocument();
    });

    it('users can add multiple subtask steps via the input inside the detail view', () => {
      render(<App />);

      // Add a new task 'Grocery shopping'
      const taskInput = screen.getByPlaceholderText(/Add a task/i);
      fireEvent.change(taskInput, { target: { value: 'Grocery shopping' } });
      fireEvent.submit(taskInput.closest('form')!);

      // Tap the newly created task to open detail view
      fireEvent.click(screen.getByText('Grocery shopping'));
      expect(screen.getByTestId('task-detail-view')).toBeInTheDocument();

      const stepInput = screen.getByTestId('add-step-input');
      const addStepBtn = screen.getByTestId('add-step-btn');

      // Add Step 1: Apples
      fireEvent.change(stepInput, { target: { value: 'Apples' } });
      fireEvent.click(addStepBtn);
      expect(screen.getByText('Apples')).toBeInTheDocument();

      // Add Step 2: Milk via Enter key
      fireEvent.change(stepInput, { target: { value: 'Milk' } });
      fireEvent.submit(stepInput.closest('form')!);
      expect(screen.getByText('Milk')).toBeInTheDocument();

      // Add Step 3: Bread
      fireEvent.change(stepInput, { target: { value: 'Bread' } });
      fireEvent.click(addStepBtn);
      expect(screen.getByText('Bread')).toBeInTheDocument();

      // Summary in detail view shows '0 of 3 steps'
      expect(screen.getByTestId('detail-steps-progress')).toHaveTextContent('0 of 3 steps');
    });

    it('subtasks can be checked and unchecked independently', () => {
      render(<App />);

      // Add task with 3 steps
      const taskInput = screen.getByPlaceholderText(/Add a task/i);
      fireEvent.change(taskInput, { target: { value: 'Launch project' } });
      fireEvent.submit(taskInput.closest('form')!);

      fireEvent.click(screen.getByText('Launch project'));

      const stepInput = screen.getByTestId('add-step-input');
      const addStepBtn = screen.getByTestId('add-step-btn');

      fireEvent.change(stepInput, { target: { value: 'Write code' } });
      fireEvent.click(addStepBtn);
      fireEvent.change(stepInput, { target: { value: 'Run tests' } });
      fireEvent.click(addStepBtn);
      fireEvent.change(stepInput, { target: { value: 'Deploy' } });
      fireEvent.click(addStepBtn);

      const stepItems = screen.getByTestId('detail-steps-list').children;
      expect(stepItems).toHaveLength(3);

      // Check step 1 ('Write code')
      const checkBtn1 = within(stepItems[0] as HTMLElement).getByRole('checkbox');
      expect(checkBtn1).toHaveAttribute('aria-checked', 'false');
      fireEvent.click(checkBtn1);
      expect(checkBtn1).toHaveAttribute('aria-checked', 'true');

      // Step 2 & 3 remain unchecked
      const checkBtn2 = within(stepItems[1] as HTMLElement).getByRole('checkbox');
      const checkBtn3 = within(stepItems[2] as HTMLElement).getByRole('checkbox');
      expect(checkBtn2).toHaveAttribute('aria-checked', 'false');
      expect(checkBtn3).toHaveAttribute('aria-checked', 'false');

      // Progress in detail view is '1 of 3 steps'
      expect(screen.getByTestId('detail-steps-progress')).toHaveTextContent('1 of 3 steps');

      // Check step 2 ('Run tests')
      fireEvent.click(checkBtn2);
      expect(checkBtn2).toHaveAttribute('aria-checked', 'true');
      expect(screen.getByTestId('detail-steps-progress')).toHaveTextContent('2 of 3 steps');

      // Uncheck step 1 ('Write code')
      fireEvent.click(checkBtn1);
      expect(checkBtn1).toHaveAttribute('aria-checked', 'false');
      expect(screen.getByTestId('detail-steps-progress')).toHaveTextContent('1 of 3 steps');
    });

    it('subtasks can be deleted', () => {
      render(<App />);

      const taskInput = screen.getByPlaceholderText(/Add a task/i);
      fireEvent.change(taskInput, { target: { value: 'Clean house' } });
      fireEvent.submit(taskInput.closest('form')!);

      fireEvent.click(screen.getByText('Clean house'));

      const stepInput = screen.getByTestId('add-step-input');
      const addStepBtn = screen.getByTestId('add-step-btn');

      fireEvent.change(stepInput, { target: { value: 'Kitchen' } });
      fireEvent.click(addStepBtn);
      fireEvent.change(stepInput, { target: { value: 'Living room' } });
      fireEvent.click(addStepBtn);

      expect(screen.getByText('Kitchen')).toBeInTheDocument();
      expect(screen.getByText('Living room')).toBeInTheDocument();

      // Delete 'Kitchen' step
      const deleteKitchenBtn = screen.getByRole('button', { name: /Delete step "Kitchen"/i });
      fireEvent.click(deleteKitchenBtn);

      expect(screen.queryByText('Kitchen')).not.toBeInTheDocument();
      expect(screen.getByText('Living room')).toBeInTheDocument();
      expect(screen.getByTestId('detail-steps-progress')).toHaveTextContent('0 of 1 step');
    });

    it('task card in list view displays subtask progress indicator (e.g., 1 of 3 steps) when subtasks exist', () => {
      render(<App />);

      // Preloaded demo task-1 ('Welcome to Tasks!') has 1 step 'Tap to see details' (0 of 1 step)
      expect(screen.getByTestId('task-steps-progress-task-1')).toHaveTextContent('0 of 1 step');

      // Add a new task 'Trip planning'
      const taskInput = screen.getByPlaceholderText(/Add a task/i);
      fireEvent.change(taskInput, { target: { value: 'Trip planning' } });
      fireEvent.submit(taskInput.closest('form')!);

      // Initially no subtask indicator on 'Trip planning' card
      expect(screen.queryByText(/of.*steps?/i)).not.toBeNull(); // task-1 has one, but 'Trip planning' doesn't

      // Open detail view for 'Trip planning'
      fireEvent.click(screen.getByText('Trip planning'));

      const stepInput = screen.getByTestId('add-step-input');
      const addStepBtn = screen.getByTestId('add-step-btn');

      // Add 3 steps
      fireEvent.change(stepInput, { target: { value: 'Book flight' } });
      fireEvent.click(addStepBtn);
      fireEvent.change(stepInput, { target: { value: 'Hotel reservation' } });
      fireEvent.click(addStepBtn);
      fireEvent.change(stepInput, { target: { value: 'Pack bags' } });
      fireEvent.click(addStepBtn);

      // Check 1 of the 3 steps
      const flightCheckbox = screen.getByRole('checkbox', { name: /Book flight/i });
      fireEvent.click(flightCheckbox);

      // Navigate back to list view
      fireEvent.click(screen.getByTestId('detail-back-btn'));

      // The task card displays '1 of 3 steps'
      expect(screen.getByText('1 of 3 steps')).toBeInTheDocument();

      // Re-open and check second step
      fireEvent.click(screen.getByText('Trip planning'));
      const hotelCheckbox = screen.getByRole('checkbox', { name: /Hotel reservation/i });
      fireEvent.click(hotelCheckbox);

      // Navigate back
      fireEvent.click(screen.getByTestId('detail-back-btn'));

      // The task card now displays '2 of 3 steps'
      expect(screen.getByText('2 of 3 steps')).toBeInTheDocument();
    });

    it('deleting all subtasks removes the progress indicator from the task card in list view', () => {
      render(<App />);

      // Open detail view for demo task-1 which has 1 step
      fireEvent.click(screen.getByText('Welcome to Tasks!'));
      expect(screen.getByTestId('task-detail-view')).toBeInTheDocument();

      // Delete the step 'Tap to see details'
      const deleteStepBtn = screen.getByRole('button', { name: /Delete step "Tap to see details"/i });
      fireEvent.click(deleteStepBtn);

      // Navigate back
      fireEvent.click(screen.getByTestId('detail-back-btn'));

      // Progress indicator is removed from task-1 card
      expect(screen.queryByTestId('task-steps-progress-task-1')).not.toBeInTheDocument();
    });

    it('persists subtasks and their completed states across simulated page reload in localStorage', () => {
      const { unmount } = render(<App />);

      // Add task with subtasks
      const taskInput = screen.getByPlaceholderText(/Add a task/i);
      fireEvent.change(taskInput, { target: { value: 'Persisted task' } });
      fireEvent.submit(taskInput.closest('form')!);

      fireEvent.click(screen.getByText('Persisted task'));

      const stepInput = screen.getByTestId('add-step-input');
      const addStepBtn = screen.getByTestId('add-step-btn');

      fireEvent.change(stepInput, { target: { value: 'Step A' } });
      fireEvent.click(addStepBtn);
      fireEvent.change(stepInput, { target: { value: 'Step B' } });
      fireEvent.click(addStepBtn);

      const stepACheckbox = screen.getByRole('checkbox', { name: /Step A/i });
      fireEvent.click(stepACheckbox);

      fireEvent.click(screen.getByTestId('detail-back-btn'));
      expect(screen.getByText('1 of 2 steps')).toBeInTheDocument();

      unmount();

      // Remount App (simulating page reload from localStorage)
      render(<App />);

      expect(screen.getByText('Persisted task')).toBeInTheDocument();
      expect(screen.getByText('1 of 2 steps')).toBeInTheDocument();

      // Open detail view and verify state
      fireEvent.click(screen.getByText('Persisted task'));
      expect(screen.getByTestId('task-detail-view')).toBeInTheDocument();
      expect(screen.getByText('Step A')).toBeInTheDocument();
      expect(screen.getByText('Step B')).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: /Step A/i })).toHaveAttribute('aria-checked', 'true');
      expect(screen.getByRole('checkbox', { name: /Step B/i })).toHaveAttribute('aria-checked', 'false');
    });

    it('allows toggling task completion and deleting task from within detail view', () => {
      render(<App />);

      fireEvent.click(screen.getByText('Welcome to Tasks!'));
      expect(screen.getByTestId('task-detail-view')).toBeInTheDocument();

      // Toggle task completion from inside detail view
      const toggleTaskBtn = screen.getByTestId('detail-toggle-task');
      expect(toggleTaskBtn).toHaveAttribute('aria-checked', 'false');
      fireEvent.click(toggleTaskBtn);
      expect(toggleTaskBtn).toHaveAttribute('aria-checked', 'true');

      // Delete task from inside detail view
      const deleteTaskBtn = screen.getByTestId('detail-delete-task-btn');
      fireEvent.click(deleteTaskBtn);

      // Detail view closes and task is removed from list
      expect(screen.queryByTestId('task-detail-view')).not.toBeInTheDocument();
      expect(screen.queryByText('Welcome to Tasks!')).not.toBeInTheDocument();
    });

    it('getStepProgress computes progress stats and formatted label correctly', () => {
      expect(getStepProgress(undefined)).toBeNull();
      expect(getStepProgress([])).toBeNull();

      expect(getStepProgress([{ id: '1', title: 'Step 1', completed: false }])).toEqual({
        total: 1,
        completed: 0,
        label: '0 of 1 step',
      });

      expect(
        getStepProgress([
          { id: '1', title: 'Step 1', completed: true },
          { id: '2', title: 'Step 2', completed: false },
          { id: '3', title: 'Step 3', completed: true },
        ])
      ).toEqual({
        total: 3,
        completed: 2,
        label: '2 of 3 steps',
      });
    });
  });

  describe('Task Notes, Due Dates & My Day Toggle in Detail View (Issue #9)', () => {
    it('detail view includes a multi-line notes section that auto-saves on change and blur', () => {
      render(<App />);

      // Open detail view for task-1
      fireEvent.click(screen.getByText('Welcome to Tasks!'));
      expect(screen.getByTestId('task-detail-view')).toBeInTheDocument();

      const notesTextarea = screen.getByTestId('detail-notes-textarea');
      expect(notesTextarea).toBeInTheDocument();
      expect(notesTextarea).toHaveValue('');

      // Type multi-line notes
      const multilineNotes = 'Line 1: Project kickoff\nLine 2: Review milestones\nLine 3: Wrap up';
      fireEvent.change(notesTextarea, { target: { value: multilineNotes } });
      expect(notesTextarea).toHaveValue(multilineNotes);

      // Trigger blur event to verify blur auto-saving
      fireEvent.blur(notesTextarea);

      // Navigate back to list view
      fireEvent.click(screen.getByTestId('detail-back-btn'));
      expect(screen.queryByTestId('task-detail-view')).not.toBeInTheDocument();

      // Re-open detail view and verify notes are retained
      fireEvent.click(screen.getByText('Welcome to Tasks!'));
      expect(screen.getByTestId('detail-notes-textarea')).toHaveValue(multilineNotes);
    });

    it('detail view includes a due date picker with quick shortcuts (Today, Tomorrow, Custom Date) and ability to clear due date', () => {
      render(<App />);

      // Open task-1 detail view
      fireEvent.click(screen.getByText('Welcome to Tasks!'));

      // 1. Click 'Today' shortcut
      const todayBtn = screen.getByRole('button', { name: /^Today$/i });
      fireEvent.click(todayBtn);

      const dueDisplay = screen.getByTestId('detail-due-date-display');
      expect(dueDisplay).toHaveTextContent(/Due Today/i);

      // Back to list: task card displays 'Due Today'
      fireEvent.click(screen.getByTestId('detail-back-btn'));
      expect(screen.getByTestId('task-due-date-badge-task-1')).toHaveTextContent(/Due Today/i);

      // 2. Re-open detail view and click 'Tomorrow' shortcut
      fireEvent.click(screen.getByText('Welcome to Tasks!'));
      const tomorrowBtn = screen.getByRole('button', { name: /^Tomorrow$/i });
      fireEvent.click(tomorrowBtn);

      expect(screen.getByTestId('detail-due-date-display')).toHaveTextContent(/Due Tomorrow/i);
      fireEvent.click(screen.getByTestId('detail-back-btn'));
      expect(screen.getByTestId('task-due-date-badge-task-1')).toHaveTextContent(/Due Tomorrow/i);

      // 3. Re-open detail view and set custom date via date input
      fireEvent.click(screen.getByText('Welcome to Tasks!'));
      const dateInput = screen.getByTestId('detail-due-date-input');
      fireEvent.change(dateInput, { target: { value: '2026-11-15' } });

      expect(screen.getByTestId('detail-due-date-display')).toHaveTextContent(/Nov 15/i);
      fireEvent.click(screen.getByTestId('detail-back-btn'));
      expect(screen.getByTestId('task-due-date-badge-task-1')).toHaveTextContent(/Nov 15/i);

      // 4. Clear due date
      fireEvent.click(screen.getByText('Welcome to Tasks!'));
      const clearBtn = screen.getByRole('button', { name: /Clear due date/i });
      fireEvent.click(clearBtn);

      expect(screen.queryByTestId('detail-due-date-display')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Clear due date/i })).not.toBeInTheDocument();

      // Back to list: task card no longer displays due date badge
      fireEvent.click(screen.getByTestId('detail-back-btn'));
      expect(screen.queryByTestId('task-due-date-badge-task-1')).not.toBeInTheDocument();
    });

    it('task card displays due date badge with visual overdue indication if past due', () => {
      render(<App />);

      // Open task-2 ('Try adding a new task below')
      fireEvent.click(screen.getByText('Try adding a new task below'));

      // Set past due date via date input
      const dateInput = screen.getByTestId('detail-due-date-input');
      fireEvent.change(dateInput, { target: { value: '2026-01-01' } });

      // Navigate back to list view
      fireEvent.click(screen.getByTestId('detail-back-btn'));

      // Verify task card displays overdue badge with visual overdue indicator
      const badge = screen.getByTestId('task-due-date-badge-task-2');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveAttribute('data-overdue', 'true');
      expect(badge).toHaveTextContent(/Overdue/i);
      expect(badge.className).toContain('text-red-600');
    });

    it('detail view includes "Add to My Day" / "Remove from My Day" toggle button reflecting current status', () => {
      render(<App />);

      // Demo task-1 is not in My Day initially
      fireEvent.click(screen.getByText('Welcome to Tasks!'));

      const myDayBtn = screen.getByTestId('detail-my-day-btn');
      expect(myDayBtn).toHaveTextContent(/Add to My Day/i);
      expect(myDayBtn).toHaveAttribute('aria-label', 'Add to My Day');

      // Click to add to My Day
      fireEvent.click(myDayBtn);

      // Button updates to reflect added status
      expect(myDayBtn).toHaveTextContent(/Remove from My Day/i);
      expect(myDayBtn).toHaveAttribute('aria-label', 'Remove from My Day');

      // Navigate back to list view
      fireEvent.click(screen.getByTestId('detail-back-btn'));

      // Task card displays active My Day status
      expect(screen.getByTestId('my-day-task-task-1')).toHaveAttribute('data-my-day', 'true');

      // Open drawer and check My Day list has task-1
      fireEvent.click(screen.getByTestId('hamburger-menu-btn'));
      fireEvent.click(screen.getByText('My Day'));

      expect(screen.getByText('Welcome to Tasks!')).toBeInTheDocument();

      // Open detail view from My Day list
      fireEvent.click(screen.getByText('Welcome to Tasks!'));
      const detailMyDayBtn = screen.getByTestId('detail-my-day-btn');
      expect(detailMyDayBtn).toHaveTextContent(/Remove from My Day/i);

      // Click to remove from My Day
      fireEvent.click(detailMyDayBtn);
      expect(detailMyDayBtn).toHaveTextContent(/Add to My Day/i);

      // Close detail view: task is removed from My Day view
      fireEvent.click(screen.getByTestId('detail-back-btn'));
      expect(screen.queryByText('Welcome to Tasks!')).not.toBeInTheDocument();

      // Task still safely preserved in parent Tasks list
      fireEvent.click(screen.getByTestId('hamburger-menu-btn'));
      fireEvent.click(screen.getByTestId('list-item-tasks'));
      expect(screen.getByText('Welcome to Tasks!')).toBeInTheDocument();
    });

    it('persists notes, due dates, and My Day status from detail view across simulated page reload in localStorage', () => {
      const { unmount } = render(<App />);

      // Add a task 'Important proposal'
      const taskInput = screen.getByPlaceholderText(/Add a task/i);
      fireEvent.change(taskInput, { target: { value: 'Important proposal' } });
      fireEvent.submit(taskInput.closest('form')!);

      fireEvent.click(screen.getByText('Important proposal'));

      // Set multi-line notes
      const notesInput = screen.getByTestId('detail-notes-textarea');
      fireEvent.change(notesInput, { target: { value: 'Pitch deck attached.\nBudget confirmed.' } });
      fireEvent.blur(notesInput);

      // Set due date to Tomorrow
      fireEvent.click(screen.getByRole('button', { name: /^Tomorrow$/i }));

      // Add to My Day
      fireEvent.click(screen.getByRole('button', { name: /Add to My Day/i }));

      fireEvent.click(screen.getByTestId('detail-back-btn'));

      unmount();

      // Remount App (simulating page reload from localStorage)
      render(<App />);

      expect(screen.getByText('Important proposal')).toBeInTheDocument();
      expect(screen.getByText(/Due Tomorrow/i)).toBeInTheDocument();

      // Open detail view and verify all values persisted
      fireEvent.click(screen.getByText('Important proposal'));
      expect(screen.getByTestId('detail-notes-textarea')).toHaveValue('Pitch deck attached.\nBudget confirmed.');
      expect(screen.getByTestId('detail-due-date-display')).toHaveTextContent(/Due Tomorrow/i);
      expect(screen.getByTestId('detail-my-day-btn')).toHaveTextContent(/Remove from My Day/i);
    });

    it('formatDueDateBadge computes correct labels and overdue flags for various dates', () => {
      const fixedToday = '2026-09-08';

      expect(formatDueDateBadge(undefined, fixedToday)).toBeNull();
      expect(formatDueDateBadge(null, fixedToday)).toBeNull();
      expect(formatDueDateBadge('', fixedToday)).toBeNull();

      // Today
      expect(formatDueDateBadge('2026-09-08', fixedToday)).toEqual({
        label: 'Due Today',
        isOverdue: false,
      });

      // Tomorrow
      expect(formatDueDateBadge('2026-09-09', fixedToday)).toEqual({
        label: 'Due Tomorrow',
        isOverdue: false,
      });

      // Yesterday (overdue)
      expect(formatDueDateBadge('2026-09-07', fixedToday)).toEqual({
        label: 'Overdue, Yesterday',
        isOverdue: true,
      });

      // Past date (overdue)
      expect(formatDueDateBadge('2026-09-01', fixedToday)).toEqual({
        label: 'Overdue, Sep 1',
        isOverdue: true,
      });

      // Future date
      expect(formatDueDateBadge('2026-09-25', fixedToday)).toEqual({
        label: 'Due Sep 25',
        isOverdue: false,
      });
    });
  });

  describe('Docked Mobile Quick-Add Bar with Shortcut Chips (Issue #10)', () => {
    it('renders docked quick-add bar with all shortcut chips at the bottom of the viewport', () => {
      render(<App />);

      const bar = screen.getByTestId('quick-add-bar');
      expect(bar).toBeInTheDocument();
      expect(bar).toHaveClass('sticky');
      expect(bar).toHaveClass('bottom-0');

      const chipDueToday = screen.getByTestId('chip-due-today');
      const chipDueTomorrow = screen.getByTestId('chip-due-tomorrow');
      const chipStar = screen.getByTestId('chip-star');
      const chipMyDay = screen.getByTestId('chip-my-day');

      expect(chipDueToday).toBeInTheDocument();
      expect(chipDueTomorrow).toBeInTheDocument();
      expect(chipStar).toBeInTheDocument();
      expect(chipMyDay).toBeInTheDocument();

      expect(chipDueToday).toHaveAttribute('data-active', 'false');
      expect(chipDueTomorrow).toHaveAttribute('data-active', 'false');
      expect(chipStar).toHaveAttribute('data-active', 'false');
      expect(chipMyDay).toHaveAttribute('data-active', 'false');

      expect(chipDueToday).toHaveAttribute('aria-pressed', 'false');
      expect(chipDueTomorrow).toHaveAttribute('aria-pressed', 'false');
      expect(chipStar).toHaveAttribute('aria-pressed', 'false');
      expect(chipMyDay).toHaveAttribute('aria-pressed', 'false');
    });

    it('toggles active state of chips when tapped and enforces mutual exclusivity on due dates', () => {
      render(<App />);

      const chipDueToday = screen.getByTestId('chip-due-today');
      const chipDueTomorrow = screen.getByTestId('chip-due-tomorrow');
      const chipStar = screen.getByTestId('chip-star');
      const chipMyDay = screen.getByTestId('chip-my-day');

      // Toggle Due Today on and off
      fireEvent.click(chipDueToday);
      expect(chipDueToday).toHaveAttribute('data-active', 'true');
      expect(chipDueToday).toHaveAttribute('aria-pressed', 'true');
      fireEvent.click(chipDueToday);
      expect(chipDueToday).toHaveAttribute('data-active', 'false');
      expect(chipDueToday).toHaveAttribute('aria-pressed', 'false');

      // Due date mutual exclusivity: Today then Tomorrow
      fireEvent.click(chipDueToday);
      expect(chipDueToday).toHaveAttribute('data-active', 'true');
      fireEvent.click(chipDueTomorrow);
      expect(chipDueToday).toHaveAttribute('data-active', 'false');
      expect(chipDueTomorrow).toHaveAttribute('data-active', 'true');
      fireEvent.click(chipDueTomorrow);
      expect(chipDueTomorrow).toHaveAttribute('data-active', 'false');

      // Toggle Star on and off
      fireEvent.click(chipStar);
      expect(chipStar).toHaveAttribute('data-active', 'true');
      fireEvent.click(chipStar);
      expect(chipStar).toHaveAttribute('data-active', 'false');

      // Toggle My Day on and off
      fireEvent.click(chipMyDay);
      expect(chipMyDay).toHaveAttribute('data-active', 'true');
      fireEvent.click(chipMyDay);
      expect(chipMyDay).toHaveAttribute('data-active', 'false');
    });

    it('creates task with Due Today shortcut chip and resets input bar and chips', () => {
      render(<App />);

      const input = screen.getByPlaceholderText('Add a task');
      const chipDueToday = screen.getByTestId('chip-due-today');
      const submitBtn = screen.getByRole('button', { name: /Add task/i });

      fireEvent.change(input, { target: { value: 'Buy concert tickets' } });
      fireEvent.click(chipDueToday);
      expect(chipDueToday).toHaveAttribute('data-active', 'true');

      fireEvent.click(submitBtn);

      // Input and chips should reset
      expect(input).toHaveValue('');
      expect(chipDueToday).toHaveAttribute('data-active', 'false');

      // Task created with Due Today badge
      expect(screen.getByText('Buy concert tickets')).toBeInTheDocument();
      const taskCard = screen.getByText('Buy concert tickets').closest('li')!;
      expect(within(taskCard).getByText(/Due Today/i)).toBeInTheDocument();
    });

    it('creates task with Due Tomorrow shortcut chip and resets input bar and chips', () => {
      render(<App />);

      const input = screen.getByPlaceholderText('Add a task');
      const chipDueTomorrow = screen.getByTestId('chip-due-tomorrow');

      fireEvent.change(input, { target: { value: 'Schedule car service' } });
      fireEvent.click(chipDueTomorrow);
      expect(chipDueTomorrow).toHaveAttribute('data-active', 'true');

      fireEvent.submit(input.closest('form')!);

      expect(input).toHaveValue('');
      expect(chipDueTomorrow).toHaveAttribute('data-active', 'false');

      expect(screen.getByText('Schedule car service')).toBeInTheDocument();
      const taskCard = screen.getByText('Schedule car service').closest('li')!;
      expect(within(taskCard).getByText(/Due Tomorrow/i)).toBeInTheDocument();
    });

    it('creates task with Star shortcut chip and marks it important in list and Important view', () => {
      render(<App />);

      const input = screen.getByPlaceholderText('Add a task');
      const chipStar = screen.getByTestId('chip-star');

      fireEvent.change(input, { target: { value: 'High priority bugfix' } });
      fireEvent.click(chipStar);
      expect(chipStar).toHaveAttribute('data-active', 'true');

      fireEvent.submit(input.closest('form')!);

      expect(input).toHaveValue('');
      expect(chipStar).toHaveAttribute('data-active', 'false');

      expect(screen.getByText('High priority bugfix')).toBeInTheDocument();
      const taskCard = screen.getByText('High priority bugfix').closest('li')!;
      expect(within(taskCard).getByRole('button', { name: /star/i })).toHaveAttribute('data-starred', 'true');

      // Navigate to Important smart list
      fireEvent.click(screen.getByRole('button', { name: /open navigation menu/i }));
      fireEvent.click(screen.getByTestId('list-item-important'));
      expect(screen.getByText('High priority bugfix')).toBeInTheDocument();
    });

    it('creates task with Add to My Day shortcut chip and marks it in My Day view', () => {
      render(<App />);

      const input = screen.getByPlaceholderText('Add a task');
      const chipMyDay = screen.getByTestId('chip-my-day');

      fireEvent.change(input, { target: { value: 'Morning meditation' } });
      fireEvent.click(chipMyDay);
      expect(chipMyDay).toHaveAttribute('data-active', 'true');

      fireEvent.submit(input.closest('form')!);

      expect(input).toHaveValue('');
      expect(chipMyDay).toHaveAttribute('data-active', 'false');

      expect(screen.getByText('Morning meditation')).toBeInTheDocument();
      const taskCard = screen.getByText('Morning meditation').closest('li')!;
      expect(within(taskCard).getByRole('button', { name: /my day/i })).toHaveAttribute('data-my-day', 'true');

      // Navigate to My Day smart list
      fireEvent.click(screen.getByRole('button', { name: /open navigation menu/i }));
      fireEvent.click(screen.getByTestId('list-item-my-day'));
      expect(screen.getByText('Morning meditation')).toBeInTheDocument();
    });

    it('creates task with multiple shortcut chips combined (Star + Due Tomorrow + Add to My Day)', () => {
      render(<App />);

      const input = screen.getByPlaceholderText('Add a task');
      const chipStar = screen.getByTestId('chip-star');
      const chipDueTomorrow = screen.getByTestId('chip-due-tomorrow');
      const chipMyDay = screen.getByTestId('chip-my-day');

      fireEvent.change(input, { target: { value: 'Launch feature announcement' } });
      fireEvent.click(chipStar);
      fireEvent.click(chipDueTomorrow);
      fireEvent.click(chipMyDay);

      expect(chipStar).toHaveAttribute('data-active', 'true');
      expect(chipDueTomorrow).toHaveAttribute('data-active', 'true');
      expect(chipMyDay).toHaveAttribute('data-active', 'true');

      fireEvent.submit(input.closest('form')!);

      // All chips reset
      expect(input).toHaveValue('');
      expect(chipStar).toHaveAttribute('data-active', 'false');
      expect(chipDueTomorrow).toHaveAttribute('data-active', 'false');
      expect(chipMyDay).toHaveAttribute('data-active', 'false');

      // Task created with all 3 attributes
      expect(screen.getByText('Launch feature announcement')).toBeInTheDocument();
      const taskCard = screen.getByText('Launch feature announcement').closest('li')!;
      expect(within(taskCard).getByRole('button', { name: /star/i })).toHaveAttribute('data-starred', 'true');
      expect(within(taskCard).getByRole('button', { name: /my day/i })).toHaveAttribute('data-my-day', 'true');
      expect(within(taskCard).getByText(/Due Tomorrow/i)).toBeInTheDocument();

      // Verify presence in Important
      fireEvent.click(screen.getByRole('button', { name: /open navigation menu/i }));
      fireEvent.click(screen.getByTestId('list-item-important'));
      expect(screen.getByText('Launch feature announcement')).toBeInTheDocument();

      // Verify presence in My Day
      fireEvent.click(screen.getByRole('button', { name: /open navigation menu/i }));
      fireEvent.click(screen.getByTestId('list-item-my-day'));
      expect(screen.getByText('Launch feature announcement')).toBeInTheDocument();
    });

    it('persists shortcut chip task attributes across simulated page reload in localStorage', () => {
      const { unmount } = render(<App />);

      const input = screen.getByPlaceholderText('Add a task');
      const chipStar = screen.getByTestId('chip-star');
      const chipDueToday = screen.getByTestId('chip-due-today');
      const chipMyDay = screen.getByTestId('chip-my-day');

      fireEvent.change(input, { target: { value: 'Persisted chip task' } });
      fireEvent.click(chipStar);
      fireEvent.click(chipDueToday);
      fireEvent.click(chipMyDay);

      fireEvent.submit(input.closest('form')!);
      expect(screen.getByText('Persisted chip task')).toBeInTheDocument();

      unmount();

      // Remount App
      render(<App />);

      expect(screen.getByText('Persisted chip task')).toBeInTheDocument();
      const reloadedCard = screen.getByText('Persisted chip task').closest('li')!;
      expect(within(reloadedCard).getByRole('button', { name: /star/i })).toHaveAttribute('data-starred', 'true');
      expect(within(reloadedCard).getByRole('button', { name: /my day/i })).toHaveAttribute('data-my-day', 'true');
      expect(within(reloadedCard).getByText(/Due Today/i)).toBeInTheDocument();
    });
  });

  describe('Collapsible Completed Tasks Section (Issue #11)', () => {
    beforeEach(() => {
      window.innerWidth = 375;
      localStorage.clear();
    });

    it('groups completed tasks under a "Completed (N)" accordion at the bottom of the active list', () => {
      render(<App />);

      // Active list contains the 2 uncompleted default tasks
      const taskList = screen.getByTestId('task-list');
      expect(within(taskList).getByText('Welcome to Tasks!')).toBeInTheDocument();
      expect(within(taskList).getByText('Try adding a new task below')).toBeInTheDocument();
      expect(within(taskList).queryByText('Tap the circle to mark a task complete')).not.toBeInTheDocument();

      // Completed section exists at the bottom with count 1
      const completedSection = screen.getByTestId('completed-section');
      expect(completedSection).toBeInTheDocument();
      expect(screen.getByTestId('completed-count-badge')).toHaveTextContent('Completed (1)');
      expect(within(completedSection).getByText('Tap the circle to mark a task complete')).toBeInTheDocument();
    });

    it('moves an active task to the completed accordion immediately when checked', () => {
      render(<App />);

      const taskList = screen.getByTestId('task-list');
      expect(within(taskList).getByText('Welcome to Tasks!')).toBeInTheDocument();
      expect(screen.getByTestId('completed-count-badge')).toHaveTextContent('Completed (1)');

      // Complete 'Welcome to Tasks!'
      const checkbox = screen.getByRole('checkbox', { name: 'Welcome to Tasks!' });
      fireEvent.click(checkbox);

      // Now active list does not contain 'Welcome to Tasks!'
      expect(within(taskList).queryByText('Welcome to Tasks!')).not.toBeInTheDocument();

      // Completed section badge increments to 2 and contains 'Welcome to Tasks!'
      expect(screen.getByTestId('completed-count-badge')).toHaveTextContent('Completed (2)');
      const completedSection = screen.getByTestId('completed-section');
      expect(within(completedSection).getByText('Welcome to Tasks!')).toBeInTheDocument();
    });

    it('expands and collapses the completed section on tap with smooth chevron rotation', () => {
      render(<App />);

      const toggleBtn = screen.getByTestId('completed-accordion-toggle');
      const chevron = screen.getByTestId('completed-chevron');
      const completedList = screen.getByTestId('completed-tasks-list');

      // Initially collapsed
      expect(toggleBtn).toHaveAttribute('aria-expanded', 'false');
      expect(chevron).toHaveClass('-rotate-90');
      expect(completedList).toHaveAttribute('data-expanded', 'false');

      // Tap to expand
      fireEvent.click(toggleBtn);
      expect(toggleBtn).toHaveAttribute('aria-expanded', 'true');
      expect(chevron).toHaveClass('rotate-0');
      expect(completedList).toHaveAttribute('data-expanded', 'true');

      // Tap to collapse again
      fireEvent.click(toggleBtn);
      expect(toggleBtn).toHaveAttribute('aria-expanded', 'false');
      expect(chevron).toHaveClass('-rotate-90');
      expect(completedList).toHaveAttribute('data-expanded', 'false');
    });

    it('shows strikethrough styling and checked box for completed tasks', () => {
      render(<App />);

      const completedSection = screen.getByTestId('completed-section');
      const taskText = within(completedSection).getByText('Tap the circle to mark a task complete');
      expect(taskText).toHaveClass('line-through');

      const checkbox = within(completedSection).getByRole('checkbox', {
        name: 'Tap the circle to mark a task complete',
      });
      expect(checkbox).toBeChecked();
    });

    it('moves completed task back to active section immediately when unchecked', () => {
      render(<App />);

      const completedSection = screen.getByTestId('completed-section');
      const taskList = screen.getByTestId('task-list');

      expect(screen.getByTestId('completed-count-badge')).toHaveTextContent('Completed (1)');
      expect(within(taskList).queryByText('Tap the circle to mark a task complete')).not.toBeInTheDocument();

      // Uncheck completed task
      const completedCheckbox = within(completedSection).getByRole('checkbox', {
        name: 'Tap the circle to mark a task complete',
      });
      fireEvent.click(completedCheckbox);

      // Moved back to active tasks list
      expect(within(taskList).getByText('Tap the circle to mark a task complete')).toBeInTheDocument();
      const restoredText = within(taskList).getByText('Tap the circle to mark a task complete');
      expect(restoredText).not.toHaveClass('line-through');

      const restoredCheckbox = within(taskList).getByRole('checkbox', {
        name: 'Tap the circle to mark a task complete',
      });
      expect(restoredCheckbox).not.toBeChecked();

      // Completed section disappears when no completed tasks remain
      expect(screen.queryByTestId('completed-section')).not.toBeInTheDocument();
    });

    it('works across different smart lists (e.g. Important)', () => {
      render(<App />);

      // Switch to Important list
      fireEvent.click(screen.getByRole('button', { name: /open navigation menu/i }));
      fireEvent.click(screen.getByTestId('list-item-important'));

      // Initially 2 important tasks (task-1 and task-5), neither completed
      expect(screen.queryByTestId('completed-section')).not.toBeInTheDocument();

      // Complete 'Welcome to Tasks!' inside Important
      const checkbox = screen.getByRole('checkbox', { name: 'Welcome to Tasks!' });
      fireEvent.click(checkbox);

      // Completed section now appears in Important with badge 'Completed (1)'
      expect(screen.getByTestId('completed-section')).toBeInTheDocument();
      expect(screen.getByTestId('completed-count-badge')).toHaveTextContent('Completed (1)');

      // Uncheck it to restore
      const completedCheckbox = within(screen.getByTestId('completed-section')).getByRole('checkbox', {
        name: 'Welcome to Tasks!',
      });
      fireEvent.click(completedCheckbox);
      expect(screen.queryByTestId('completed-section')).not.toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: 'Welcome to Tasks!' })).not.toBeChecked();
    });

    it('persists completed tasks in the accordion across simulated page reload in localStorage', () => {
      const { unmount } = render(<App />);

      // Complete 'Welcome to Tasks!'
      const checkbox = screen.getByRole('checkbox', { name: 'Welcome to Tasks!' });
      fireEvent.click(checkbox);
      expect(screen.getByTestId('completed-count-badge')).toHaveTextContent('Completed (2)');

      unmount();

      // Remount
      render(<App />);

      expect(screen.getByTestId('completed-count-badge')).toHaveTextContent('Completed (2)');
      const completedSection = screen.getByTestId('completed-section');
      expect(within(completedSection).getByText('Welcome to Tasks!')).toBeInTheDocument();
      expect(within(completedSection).getByText('Tap the circle to mark a task complete')).toBeInTheDocument();
      expect(within(screen.getByTestId('task-list')).getByText('Try adding a new task below')).toBeInTheDocument();
    });
  });

  describe('Sensory Audio Chime & Mobile Haptics (Issue #12)', () => {
    let mockOscillators: Array<{
      type: string;
      frequency: { setValueAtTime: ReturnType<typeof vi.fn> };
      connect: ReturnType<typeof vi.fn>;
      start: ReturnType<typeof vi.fn>;
      stop: ReturnType<typeof vi.fn>;
    }>;
    let mockGains: Array<{
      gain: {
        setValueAtTime: ReturnType<typeof vi.fn>;
        exponentialRampToValueAtTime: ReturnType<typeof vi.fn>;
      };
      connect: ReturnType<typeof vi.fn>;
    }>;
    let mockAudioContextInstance: {
      currentTime: number;
      state: string;
      resume: ReturnType<typeof vi.fn>;
      destination: Record<string, unknown>;
      createOscillator: ReturnType<typeof vi.fn>;
      createGain: ReturnType<typeof vi.fn>;
    };
    let mockAudioContextConstructor: ReturnType<typeof vi.fn>;
    let mockVibrate: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      window.innerWidth = 375;
      localStorage.clear();
      resetAudioContext();

      mockOscillators = [];
      mockGains = [];

      mockVibrate = vi.fn();
      Object.defineProperty(navigator, 'vibrate', {
        value: mockVibrate,
        configurable: true,
        writable: true,
      });

      mockAudioContextInstance = {
        currentTime: 0,
        state: 'running',
        resume: vi.fn().mockResolvedValue(undefined),
        destination: {},
        createOscillator: vi.fn().mockImplementation(() => {
          const osc = {
            type: '',
            frequency: { setValueAtTime: vi.fn() },
            connect: vi.fn(),
            start: vi.fn(),
            stop: vi.fn(),
          };
          mockOscillators.push(osc);
          return osc;
        }),
        createGain: vi.fn().mockImplementation(() => {
          const gain = {
            gain: {
              setValueAtTime: vi.fn(),
              exponentialRampToValueAtTime: vi.fn(),
            },
            connect: vi.fn(),
          };
          mockGains.push(gain);
          return gain;
        }),
      };

      mockAudioContextConstructor = vi.fn().mockImplementation(function () {
        return mockAudioContextInstance;
      });
      window.AudioContext = mockAudioContextConstructor as unknown as typeof AudioContext;
    });

    afterEach(() => {
      resetAudioContext();
      delete (window as { AudioContext?: unknown }).AudioContext;
      delete (navigator as { vibrate?: unknown }).vibrate;
    });

    it('synthesizes signature two-tone completion chime and triggers mobile vibration on task completion', () => {
      render(<App />);

      const activeCheckbox = screen.getByRole('checkbox', { name: 'Welcome to Tasks!' });
      fireEvent.click(activeCheckbox);

      // Haptic feedback invoked with exact signature pattern [15, 30, 15]
      expect(mockVibrate).toHaveBeenCalledTimes(1);
      expect(mockVibrate).toHaveBeenCalledWith(HAPTIC_FEEDBACK_PATTERN);

      // Web Audio API AudioContext instantiated and used to generate two-tone chime
      expect(mockAudioContextConstructor).toHaveBeenCalled();
      expect(mockAudioContextInstance.createOscillator).toHaveBeenCalledTimes(2);
      expect(mockAudioContextInstance.createGain).toHaveBeenCalledTimes(2);

      // Oscillators configured with sine wave
      expect(mockOscillators[0].type).toBe('sine');
      expect(mockOscillators[1].type).toBe('sine');

      // Tone 1: Root chime frequency (587.33 Hz) starting at currentTime 0
      expect(mockOscillators[0].frequency.setValueAtTime).toHaveBeenCalledWith(
        ROOT_CHIME_FREQUENCY,
        0
      );
      expect(mockOscillators[0].start).toHaveBeenCalledWith(0);
      expect(mockOscillators[0].stop).toHaveBeenCalledWith(0.25);
      expect(mockGains[0].gain.exponentialRampToValueAtTime).toHaveBeenCalledWith(0.0001, 0.25);

      // Tone 2: Octave chime frequency (1174.66 Hz) delayed by 0.1s
      expect(mockOscillators[1].frequency.setValueAtTime).toHaveBeenCalledWith(
        OCTAVE_CHIME_FREQUENCY,
        0.1
      );
      expect(mockOscillators[1].start).toHaveBeenCalledWith(0.1);
      expect(mockOscillators[1].stop.mock.calls[0][0]).toBeCloseTo(0.45);
      expect(mockGains[1].gain.exponentialRampToValueAtTime.mock.calls[0][0]).toBeCloseTo(0.0001);
      expect(mockGains[1].gain.exponentialRampToValueAtTime.mock.calls[0][1]).toBeCloseTo(0.45);
    });

    it('triggers completion chime and mobile vibration on subtask (step) completion in detail view', () => {
      render(<App />);

      // Open detail view of task-1
      fireEvent.click(screen.getByText('Welcome to Tasks!'));
      expect(screen.getByTestId('task-detail-view')).toBeInTheDocument();

      mockVibrate.mockClear();
      mockAudioContextInstance.createOscillator.mockClear();
      mockAudioContextInstance.createGain.mockClear();

      // Check subtask step-1-1
      const stepCheckbox = screen.getByTestId('toggle-step-step-1-1');
      fireEvent.click(stepCheckbox);

      expect(mockVibrate).toHaveBeenCalledTimes(1);
      expect(mockVibrate).toHaveBeenCalledWith(HAPTIC_FEEDBACK_PATTERN);
      expect(mockAudioContextInstance.createOscillator).toHaveBeenCalledTimes(2);
      expect(mockAudioContextInstance.createGain).toHaveBeenCalledTimes(2);
    });

    it('does not trigger audio chime or mobile vibration when unchecking a completed task or step', () => {
      render(<App />);

      // Open completed tasks accordion
      const accordionBtn = screen.getByTestId('completed-accordion-toggle');
      fireEvent.click(accordionBtn);

      mockVibrate.mockClear();
      mockAudioContextInstance.createOscillator.mockClear();
      mockAudioContextInstance.createGain.mockClear();

      // Uncheck completed task
      const completedCheckbox = within(screen.getByTestId('completed-section')).getByRole('checkbox', {
        name: 'Tap the circle to mark a task complete',
      });
      fireEvent.click(completedCheckbox);

      // Neither vibrate nor audio chime should trigger on uncheck
      expect(mockVibrate).not.toHaveBeenCalled();
      expect(mockAudioContextInstance.createOscillator).not.toHaveBeenCalled();
    });

    it('navigation drawer includes sound effects toggle setting with active state and sound icon', () => {
      render(<App />);

      // Open navigation drawer
      fireEvent.click(screen.getByRole('button', { name: /open navigation menu/i }));

      // Verify settings section exists in drawer
      expect(screen.getByTestId('drawer-settings-section')).toBeInTheDocument();

      // Verify sound toggle switch button
      const soundToggle = screen.getByRole('switch', { name: /sound effects/i });
      expect(soundToggle).toBeInTheDocument();
      expect(soundToggle).toHaveAttribute('aria-checked', 'true');
      expect(screen.getByText('Sound effects')).toBeInTheDocument();

      // Verify clicking the label toggles the switch cleanly without double-triggering
      fireEvent.click(screen.getByText('Sound effects'));
      expect(soundToggle).toHaveAttribute('aria-checked', 'false');
      fireEvent.click(screen.getByText('Sound effects'));
      expect(soundToggle).toHaveAttribute('aria-checked', 'true');
    });

    it('toggling sound effects off mutes audio chime on task completion while maintaining haptic vibration', () => {
      render(<App />);

      // Open navigation drawer
      fireEvent.click(screen.getByRole('button', { name: /open navigation menu/i }));

      // Toggle sound off
      const soundToggle = screen.getByRole('switch', { name: /sound effects/i });
      fireEvent.click(soundToggle);
      expect(soundToggle).toHaveAttribute('aria-checked', 'false');

      // Close drawer
      fireEvent.click(screen.getByTestId('close-drawer-btn'));

      mockVibrate.mockClear();
      mockAudioContextInstance.createOscillator.mockClear();
      mockAudioContextInstance.createGain.mockClear();

      // Complete active task
      const activeCheckbox = screen.getByRole('checkbox', { name: 'Welcome to Tasks!' });
      fireEvent.click(activeCheckbox);

      // Vibration still occurs
      expect(mockVibrate).toHaveBeenCalledTimes(1);
      expect(mockVibrate).toHaveBeenCalledWith(HAPTIC_FEEDBACK_PATTERN);

      // But AudioContext was NOT invoked (sound is muted)
      expect(mockAudioContextInstance.createOscillator).not.toHaveBeenCalled();
    });

    it('persists sound preference across simulated page reload in localStorage', () => {
      const { unmount } = render(<App />);

      // Open drawer and mute sound effects
      fireEvent.click(screen.getByRole('button', { name: /open navigation menu/i }));
      const soundToggle = screen.getByRole('switch', { name: /sound effects/i });
      fireEvent.click(soundToggle);

      expect(localStorage.getItem(STORAGE_KEY_SOUND_ENABLED)).toBe('false');

      unmount();

      // Re-mount app simulating browser reload
      render(<App />);

      // Verify toggle setting is still muted in drawer
      fireEvent.click(screen.getByRole('button', { name: /open navigation menu/i }));
      const reloadedToggle = screen.getByRole('switch', { name: /sound effects/i });
      expect(reloadedToggle).toHaveAttribute('aria-checked', 'false');

      // Close drawer and complete a task -> Audio should be muted
      fireEvent.click(screen.getByTestId('close-drawer-btn'));
      mockAudioContextInstance.createOscillator.mockClear();
      fireEvent.click(screen.getByRole('checkbox', { name: 'Welcome to Tasks!' }));
      expect(mockAudioContextInstance.createOscillator).not.toHaveBeenCalled();

      // Re-enable sound
      fireEvent.click(screen.getByRole('button', { name: /open navigation menu/i }));
      fireEvent.click(screen.getByRole('switch', { name: /sound effects/i }));
      expect(screen.getByRole('switch', { name: /sound effects/i })).toHaveAttribute('aria-checked', 'true');
      expect(localStorage.getItem(STORAGE_KEY_SOUND_ENABLED)).toBe('true');

      // Complete another task -> Audio chime plays now
      fireEvent.click(screen.getByTestId('close-drawer-btn'));
      mockAudioContextInstance.createOscillator.mockClear();
      fireEvent.click(screen.getByRole('checkbox', { name: 'Try adding a new task below' }));
      expect(mockAudioContextInstance.createOscillator).toHaveBeenCalledTimes(2);
    });

    it('sensory audio engine handles absent AudioContext or unsupported vibration gracefully without crashing', () => {
      delete (window as { AudioContext?: unknown }).AudioContext;
      delete (navigator as { vibrate?: unknown }).vibrate;
      resetAudioContext();

      render(<App />);

      expect(() => {
        fireEvent.click(screen.getByRole('checkbox', { name: 'Welcome to Tasks!' }));
      }).not.toThrow();
    });
  });

  describe('JSON Backup Export & Import (Issue #13)', () => {
    let createObjectURLMock: ReturnType<typeof vi.fn>;
    let revokeObjectURLMock: ReturnType<typeof vi.fn>;
    let clickMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      createObjectURLMock = vi.fn().mockReturnValue('blob:http://localhost/mock-backup-url');
      revokeObjectURLMock = vi.fn();
      window.URL.createObjectURL = createObjectURLMock as unknown as typeof window.URL.createObjectURL;
      window.URL.revokeObjectURL = revokeObjectURLMock as unknown as typeof window.URL.revokeObjectURL;
      clickMock = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    });

    afterEach(() => {
      clickMock.mockRestore();
      delete (window.URL as { createObjectURL?: unknown }).createObjectURL;
      delete (window.URL as { revokeObjectURL?: unknown }).revokeObjectURL;
    });

    it('navigation drawer includes Backup & Restore panel with Export Backup and Import Backup options', () => {
      render(<App />);

      // Open navigation drawer
      fireEvent.click(screen.getByRole('button', { name: /open navigation menu/i }));

      // Verify Backup & Restore panel exists in drawer settings
      const panel = screen.getByTestId('backup-restore-panel');
      expect(panel).toBeInTheDocument();
      expect(within(panel).getByText('Backup & Restore')).toBeInTheDocument();

      // Verify Export Backup button
      const exportBtn = screen.getByRole('button', { name: /export backup/i });
      expect(exportBtn).toBeInTheDocument();
      expect(exportBtn).toHaveAttribute('data-testid', 'export-backup-btn');

      // Verify Import Backup button and file input
      const importBtn = screen.getByRole('button', { name: /import backup/i });
      expect(importBtn).toBeInTheDocument();
      expect(importBtn).toHaveAttribute('data-testid', 'import-backup-btn');

      const fileInput = screen.getByTestId('import-backup-input');
      expect(fileInput).toBeInTheDocument();
      expect(fileInput).toHaveAttribute('type', 'file');
      expect(fileInput).toHaveAttribute('accept', '.json,application/json');
    });

    it('exporting triggers browser download of clean formatted JSON file containing all lists and tasks', async () => {
      render(<App />);

      // Open drawer
      fireEvent.click(screen.getByRole('button', { name: /open navigation menu/i }));

      // Click Export Backup
      const exportBtn = screen.getByRole('button', { name: /export backup/i });
      fireEvent.click(exportBtn);

      // Verify URL.createObjectURL called with Blob
      expect(createObjectURLMock).toHaveBeenCalledTimes(1);
      const [exportedBlob] = createObjectURLMock.mock.calls[0] as [Blob];
      expect(exportedBlob).toBeInstanceOf(Blob);
      expect(exportedBlob.type).toBe('application/json');

      // Verify downloaded JSON content
      const blobText = await exportedBlob.text();
      const parsed = JSON.parse(blobText);
      expect(parsed).toHaveProperty('version', 1);
      expect(parsed).toHaveProperty('exportedAt');
      expect(Array.isArray(parsed.lists)).toBe(true);
      expect(Array.isArray(parsed.tasks)).toBe(true);
      expect(parsed.lists.length).toBeGreaterThan(0);
      expect(parsed.tasks.length).toBeGreaterThan(0);

      // Verify click was triggered on anchor element
      expect(clickMock).toHaveBeenCalled();
      expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:http://localhost/mock-backup-url');
    });

    it('importing validates JSON structure and rehydrates lists and tasks in localStorage and state', async () => {
      render(<App />);

      // Open drawer
      fireEvent.click(screen.getByRole('button', { name: /open navigation menu/i }));

      const backupData = {
        version: 1,
        exportedAt: '2026-09-08T10:00:00.000Z',
        lists: [
          {
            id: 'custom-vacation',
            name: 'Summer Vacation',
            icon: '🏖️',
            colorTheme: 'amber',
            isSystem: false,
          },
        ],
        tasks: [
          {
            id: 'custom-task-100',
            title: 'Book resort tickets',
            completed: false,
            isImportant: true,
            inMyDay: true,
            myDayDate: '2026-09-08',
            steps: [{ id: 'step-1', title: 'Check availability', completed: true }],
            listId: 'custom-vacation',
            createdAt: '2026-09-08T10:00:00.000Z',
          },
        ],
      };

      const backupFile = new File([JSON.stringify(backupData)], 'backup.json', {
        type: 'application/json',
      });

      const fileInput = screen.getByTestId('import-backup-input');
      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [backupFile] } });
      });

      // Verify success status
      expect(await screen.findByRole('status')).toHaveTextContent(/backup restored successfully/i);

      // Verify imported custom list appears in drawer
      expect(screen.getByTestId('list-item-custom-vacation')).toBeInTheDocument();
      expect(screen.getByText('Summer Vacation')).toBeInTheDocument();

      // Switch to the newly imported list
      fireEvent.click(screen.getByTestId('list-item-custom-vacation'));

      // Verify imported task is visible
      expect(screen.getByText('Book resort tickets')).toBeInTheDocument();
      expect(screen.getByText('1 of 1 step')).toBeInTheDocument();

      // Verify localStorage was updated
      const storedLists = JSON.parse(localStorage.getItem(STORAGE_KEY_LISTS) || '[]');
      const storedTasks = JSON.parse(localStorage.getItem(STORAGE_KEY_TASKS) || '[]');
      expect(storedLists.some((l: { id: string }) => l.id === 'custom-vacation')).toBe(true);
      expect(storedTasks.some((t: { id: string }) => t.id === 'custom-task-100')).toBe(true);
    });

    it('invalid JSON files trigger clear user error feedback without corrupting existing data', async () => {
      render(<App />);

      // Open drawer
      fireEvent.click(screen.getByRole('button', { name: /open navigation menu/i }));

      const fileInput = screen.getByTestId('import-backup-input');

      // Test 1: Malformed JSON syntax
      const malformedFile = new File(['{ this is not valid json!'], 'invalid.json', {
        type: 'application/json',
      });

      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [malformedFile] } });
      });

      const alert = await screen.findByRole('alert');
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveTextContent(/invalid json format/i);

      // Verify existing tasks and lists were not corrupted
      expect(screen.getByText('Personal')).toBeInTheDocument();
      expect(screen.getByText('Work')).toBeInTheDocument();

      // Test 2: Schema missing tasks array
      const invalidSchemaFile = new File(
        [JSON.stringify({ lists: [] })],
        'no-tasks.json',
        { type: 'application/json' }
      );

      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [invalidSchemaFile] } });
      });

      expect(await screen.findByRole('alert')).toHaveTextContent(/missing or invalid 'tasks' array/i);

      // Test 3: Empty file
      const emptyFile = new File(['   '], 'empty.json', { type: 'application/json' });
      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [emptyFile] } });
      });
      expect(await screen.findByRole('alert')).toHaveTextContent(/backup file is empty/i);
    });

    it('full end-to-end export and import roundtrip preserves user data across simulated reload', async () => {
      const { unmount } = render(<App />);

      // Add a custom task to default list
      const taskInput = screen.getByPlaceholderText('Add a task');
      fireEvent.change(taskInput, { target: { value: 'Roundtrip Test Task' } });
      fireEvent.click(screen.getByRole('button', { name: /add task/i }));

      expect(await screen.findByText('Roundtrip Test Task')).toBeInTheDocument();

      // Open drawer and export
      fireEvent.click(screen.getByRole('button', { name: /open navigation menu/i }));
      fireEvent.click(screen.getByRole('button', { name: /export backup/i }));

      expect(createObjectURLMock).toHaveBeenCalled();
      const [exportedBlob] = createObjectURLMock.mock.calls[0] as [Blob];
      const exportedJsonText = await exportedBlob.text();

      // Simulate browser refresh with empty/reset state
      unmount();
      localStorage.clear();

      // Re-render fresh app
      const { unmount: unmountSecond } = render(<App />);
      expect(screen.queryByText('Roundtrip Test Task')).not.toBeInTheDocument();

      // Open drawer and import the exported backup
      fireEvent.click(screen.getByRole('button', { name: /open navigation menu/i }));
      const file = new File([exportedJsonText], 'backup-roundtrip.json', {
        type: 'application/json',
      });
      await act(async () => {
        fireEvent.change(screen.getByTestId('import-backup-input'), {
          target: { files: [file] },
        });
      });

      expect(await screen.findByRole('status')).toHaveTextContent(/backup restored successfully/i);

      // Close drawer
      fireEvent.click(screen.getByTestId('close-drawer-btn'));

      // Verify restored task is present
      expect(screen.getByText('Roundtrip Test Task')).toBeInTheDocument();

      // Simulate another reload to verify localStorage persistence
      unmountSecond();
      render(<App />);
      expect(screen.getByText('Roundtrip Test Task')).toBeInTheDocument();
    });

    it('schema validation helpers validateBackupData and parseAndValidateBackup enforce rules strictly', () => {
      expect(validateBackupData(null).valid).toBe(false);
      expect(validateBackupData([]).valid).toBe(false);
      expect(validateBackupData({ lists: 'not-array', tasks: [] }).valid).toBe(false);
      expect(parseAndValidateBackup('').valid).toBe(false);
      expect(parseAndValidateBackup('null').valid).toBe(false);
      expect(parseAndValidateBackup('[]').valid).toBe(false);
      expect(parseAndValidateBackup('{"lists": "not-array", "tasks": []}').valid).toBe(false);
      expect(parseAndValidateBackup('{"lists": [], "tasks": "not-array"}').valid).toBe(false);
      expect(
        parseAndValidateBackup('{"lists": [{"id": ""}], "tasks": []}').valid
      ).toBe(false);
      expect(
        parseAndValidateBackup('{"lists": [], "tasks": [{"id": "t1", "completed": false}]}').valid
      ).toBe(false); // missing title

      // Valid minimal structure
      const valid = parseAndValidateBackup('{"lists": [], "tasks": []}');
      expect(valid.valid).toBe(true);
      if (valid.valid) {
        expect(valid.data.lists.length).toBeGreaterThanOrEqual(3); // system lists ensured
      }

      // createBackupPayload formats properly
      const payload = createBackupPayload([], []);
      expect(payload.version).toBe(1);
      expect(payload.lists.length).toBe(3); // system lists ensured
      expect(payload.tasks).toEqual([]);

      // ensureSystemLists places My Day, Tasks, and Important first even with custom lists
      const rawLists = [
        { id: 'custom-1', name: 'Custom 1', icon: '📁', colorTheme: 'blue', isSystem: false },
      ];
      const ensured = ensureSystemLists(rawLists);
      expect(ensured.map((l) => l.id)).toEqual(['my-day', 'tasks', 'important', 'custom-1']);
    });
  });
});

