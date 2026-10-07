const key = (id) => `bs-owner-${id}`;

export const getOwnerToken = (id) => {
  try {
    return localStorage.getItem(key(id)) || '';
  } catch {
    return '';
  }
};

export const setOwnerToken = (id, token) => {
  try {
    localStorage.setItem(key(id), token);
  } catch {
    /* sin almacenamiento disponible */
  }
};
