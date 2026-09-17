export const safeGetLS = (key, def_val = null) => {
  try {
    return localStorage.getItem(key) || def_val;
  } catch (e) {
    return def_val;
  }
};

export const safeSetLS = (key, val) => {
  try {
    localStorage.setItem(key, val);
  } catch (e) {}
};

export const safeRemoveLS = (key) => {
  try {
    localStorage.removeItem(key);
  } catch (e) {}
};

// Keyboard-activation handler for elements that act like buttons.
// Use on a <div role="button" tabIndex={0}> to fire `onActivate` on Enter/Space,
// matching native <button> behaviour so keyboard & screen-reader users can use it.
export const onActivateKey = (onActivate) => (e) => {
  if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
    e.preventDefault();
    onActivate();
  }
};
