import { calculatePercentage, formatCurrency, formatCompactCurrency, getMonthRange } from '@/lib/utils';

describe('Budget Calculations', () => {
  describe('calculatePercentage', () => {
    it('should calculate percentage correctly', () => {
      expect(calculatePercentage(50, 100)).toBe(50);
      expect(calculatePercentage(75, 100)).toBe(75);
      expect(calculatePercentage(25, 50)).toBe(50);
    });

    it('should return 0 when total is 0', () => {
      expect(calculatePercentage(50, 0)).toBe(0);
    });

    it('should handle over 100% cases', () => {
      expect(calculatePercentage(150, 100)).toBe(150);
    });

    it('should round to nearest integer', () => {
      expect(calculatePercentage(33, 100)).toBe(33);
      expect(calculatePercentage(1, 3)).toBe(33);
    });
  });

  describe('formatCurrency', () => {
    it('should format NGN currency correctly', () => {
      expect(formatCurrency(1000, 'NGN')).toBe('₦1,000');
      expect(formatCurrency(1000000, 'NGN')).toBe('₦1,000,000');
    });

    it('should format USD currency correctly', () => {
      expect(formatCurrency(1000, 'USD')).toBe('$1,000');
    });

    it('should format GBP currency correctly', () => {
      expect(formatCurrency(1000, 'GBP')).toBe('£1,000');
    });

    it('should handle decimal amounts', () => {
      expect(formatCurrency(1000.50, 'NGN')).toBe('₦1,000.5');
    });
  });

  describe('formatCompactCurrency', () => {
    it('should format millions with M suffix', () => {
      expect(formatCompactCurrency(1000000, 'NGN')).toBe('₦1.0M');
      expect(formatCompactCurrency(2500000, 'NGN')).toBe('₦2.5M');
    });

    it('should format thousands with K suffix', () => {
      expect(formatCompactCurrency(1000, 'NGN')).toBe('₦1.0K');
      expect(formatCompactCurrency(50000, 'NGN')).toBe('₦50.0K');
    });

    it('should not add suffix for small amounts', () => {
      expect(formatCompactCurrency(500, 'NGN')).toBe('₦500');
    });
  });

  describe('getMonthRange', () => {
    it('should return correct start and end dates for January', () => {
      const { start, end } = getMonthRange(1, 2024);
      expect(start.getMonth()).toBe(0);
      expect(start.getDate()).toBe(1);
      expect(end.getMonth()).toBe(0);
      expect(end.getDate()).toBe(31);
    });

    it('should return correct start and end dates for February (non-leap year)', () => {
      const { start, end } = getMonthRange(2, 2023);
      expect(start.getMonth()).toBe(1);
      expect(end.getDate()).toBe(28);
    });

    it('should return correct start and end dates for February (leap year)', () => {
      const { start, end } = getMonthRange(2, 2024);
      expect(start.getMonth()).toBe(1);
      expect(end.getDate()).toBe(29);
    });
  });
});

describe('Budget Alert Logic', () => {
  const checkBudgetAlert = (spent: number, budget: number, threshold: number): boolean => {
    const percentage = calculatePercentage(spent, budget);
    return percentage >= threshold;
  };

  it('should trigger alert when threshold is reached', () => {
    expect(checkBudgetAlert(80, 100, 80)).toBe(true);
    expect(checkBudgetAlert(90, 100, 80)).toBe(true);
  });

  it('should not trigger alert below threshold', () => {
    expect(checkBudgetAlert(70, 100, 80)).toBe(false);
    expect(checkBudgetAlert(50, 100, 80)).toBe(false);
  });

  it('should trigger alert when over budget', () => {
    expect(checkBudgetAlert(120, 100, 80)).toBe(true);
    expect(checkBudgetAlert(100, 100, 100)).toBe(true);
  });
});
