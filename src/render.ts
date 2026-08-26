import { html } from 'hono/html';

// Hono 的 JSX 不会自动带 <!DOCTYPE html>，需要手动拼在最外层
export const doc = (node: any) => html`<!DOCTYPE html>${node}`;
