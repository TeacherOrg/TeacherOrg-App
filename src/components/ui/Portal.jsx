import React from 'react';
import { createPortal } from 'react-dom';

export default function Portal({ children }) {
  return typeof document === 'object'
    ? createPortal(children, document.body)
    : null;
}