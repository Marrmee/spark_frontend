export const convertSecondsToReadableTime = (
  originalSeconds: number
): string => {
  // Handle edge case where input might not be a valid number
  if (isNaN(originalSeconds) || originalSeconds < 0) {
    return 'Invalid duration';
  }

  // Store the original value for calculations
  const totalSeconds = Math.floor(originalSeconds); // Ensure we work with whole seconds

  // Don't check window.innerWidth on server side
  const isSmallScreen =
    typeof window !== 'undefined' && window.innerWidth < 450;

  // *** FIX: Handle zero seconds explicitly ***
  if (totalSeconds === 0) {
    return isSmallScreen ? '0 sec.' : '0 seconds';
  }
  // *** END FIX ***

  let seconds = totalSeconds;

  const months = Math.floor(seconds / (30.44 * 24 * 3600)); // Average month = 30.44 days
  seconds %= Math.floor(30.44 * 24 * 3600);

  const weeks = Math.floor(seconds / (7 * 24 * 3600)); // 1 week = 7 days
  seconds %= 7 * 24 * 3600;

  const days = Math.floor(seconds / (24 * 3600)); // 1 day = 24 hours
  seconds %= 24 * 3600;

  const hours = Math.floor(seconds / 3600); // 1 hour = 3600 seconds
  seconds %= 3600;

  const minutes = Math.floor(seconds / 60); // 1 minute = 60 seconds
  const secs = Math.floor(seconds % 60); // Use Math.floor for remaining seconds too

  const timeParts: string[] = [];
  let largestUnitPresent = ''; // Track the largest unit for parenthetical logic

  if (isSmallScreen) {
    // Use abbreviated format with dots for small screens
    if (months > 0) {
      timeParts.push(`${months} mo.`);
      if (!largestUnitPresent) largestUnitPresent = 'months';
    }
    if (weeks > 0) {
      timeParts.push(`${weeks} w.`);
      if (!largestUnitPresent) largestUnitPresent = 'weeks';
    }
    if (days > 0) {
      timeParts.push(`${days} d.`);
      if (!largestUnitPresent) largestUnitPresent = 'days';
    }
    if (hours > 0) {
      timeParts.push(`${hours} h.`);
      if (!largestUnitPresent) largestUnitPresent = 'hours';
    }
    if (minutes > 0) {
      timeParts.push(`${minutes} min.`);
      if (!largestUnitPresent) largestUnitPresent = 'minutes';
    }
    // Only show seconds if it's the only unit or if other units are present
    if (secs > 0 || timeParts.length === 0) {
      timeParts.push(`${secs} sec.`);
      if (!largestUnitPresent) largestUnitPresent = 'seconds';
    }
  } else {
    // Use full words for larger screens
    if (months > 0) {
      timeParts.push(`${months} month${months > 1 ? 's' : ''}`);
      if (!largestUnitPresent) largestUnitPresent = 'months';
    }
    if (weeks > 0) {
      timeParts.push(`${weeks} week${weeks > 1 ? 's' : ''}`);
      if (!largestUnitPresent) largestUnitPresent = 'weeks';
    }
    if (days > 0) {
      timeParts.push(`${days} day${days > 1 ? 's' : ''}`);
      if (!largestUnitPresent) largestUnitPresent = 'days';
    }
    if (hours > 0) {
      timeParts.push(`${hours} hour${hours > 1 ? 's' : ''}`);
      if (!largestUnitPresent) largestUnitPresent = 'hours';
    }
    if (minutes > 0) {
      timeParts.push(`${minutes} minute${minutes > 1 ? 's' : ''}`);
      if (!largestUnitPresent) largestUnitPresent = 'minutes';
    }
    // Only show seconds if it's the only unit or if other units are present
    if (secs > 0 || timeParts.length === 0) {
      timeParts.push(`${secs} second${secs > 1 ? 's' : ''}`);
      if (!largestUnitPresent) largestUnitPresent = 'seconds';
    }
  }

  const primaryDisplay =
    timeParts.length > 0
      ? timeParts.join(' and ')
      : isSmallScreen
        ? '0 sec.'
        : '0 seconds';

  let parenthetical = '';
  if (timeParts.length > 1) {
    let totalValue = 0;
    let unitName = '';

    switch (largestUnitPresent) {
      case 'months':
        totalValue = Math.floor(totalSeconds / (7 * 24 * 3600)); // Total in weeks
        unitName = isSmallScreen ? 'w.' : totalValue === 1 ? 'week' : 'weeks';
        break;
      case 'weeks':
        totalValue = Math.floor(totalSeconds / (24 * 3600)); // Total in days
        unitName = isSmallScreen ? 'd.' : totalValue === 1 ? 'day' : 'days';
        break;
      case 'days':
        const totalHoursFloat = totalSeconds / 3600;
        const formattedTotalHours =
          totalHoursFloat % 1 === 0
            ? totalHoursFloat.toString()
            : totalHoursFloat.toFixed(1);
        const totalValueForUnitName = Math.floor(totalHoursFloat);
        unitName = isSmallScreen
          ? 'h.'
          : totalValueForUnitName === 1 && totalHoursFloat < 2
            ? 'hour'
            : 'hours'; // Ensure 1.0-1.9 is singular 'hour'
        // The parenthetical string will use formattedTotalHours
        if (parseFloat(formattedTotalHours) > 0 && unitName) {
          parenthetical = ` (${formattedTotalHours} ${unitName})`;
        }
        const calculatedHours = totalSeconds / 3600; // Floating point hours
        totalValue = calculatedHours;
        const hoursForUnitName = Math.floor(calculatedHours);
        unitName = isSmallScreen
          ? 'h.'
          : hoursForUnitName === 1 && calculatedHours < 2
            ? 'hour'
            : 'hours';
        const hoursValue = totalSeconds / 3600;
        const hoursDisplay =
          hoursValue % 1 === 0 ? hoursValue.toString() : hoursValue.toFixed(1);
        const unitForHours = isSmallScreen
          ? 'h.'
          : Math.floor(hoursValue) === 1 && hoursValue < 2
            ? 'hour'
            : 'hours';
        parenthetical = ` (${hoursDisplay} ${unitForHours})`;
        // To prevent the default logic after switch from running for this case:
        largestUnitPresent = '__handled_days_case__'; // Mark as handled

        break;
      case 'hours':
        totalValue = Math.floor(totalSeconds / 60); // Total in minutes
        unitName = isSmallScreen
          ? 'min.'
          : totalValue === 1
            ? 'minute'
            : 'minutes';
        break;
      case 'minutes':
        totalValue = totalSeconds; // Total in seconds
        unitName = isSmallScreen
          ? 'sec.'
          : totalValue === 1
            ? 'second'
            : 'seconds';
        break;
    }

    if (totalValue > 0 && unitName) {
      parenthetical = ` (${totalValue.toLocaleString()} ${unitName})`;
    }
  }

  return primaryDisplay + parenthetical;
};
