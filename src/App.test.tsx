import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import App from './App';

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
      expect(taskCheckbox).toBeChecked();

      // Toggle back to uncomplete
      fireEvent.click(taskCheckbox);
      expect(taskCheckbox).not.toBeChecked();
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
      expect(persistedCheckbox).toBeChecked();

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
      expect(taskCheckbox).toBeChecked();

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
});
