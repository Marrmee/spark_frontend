/**
 * Set a CSS variable on the document element
 * @param name The name of the variable to set
 * @param value The value to set the variable to
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const cssVar = (name: string, value: any) => {
  document.documentElement.style.setProperty(name, value);
};
