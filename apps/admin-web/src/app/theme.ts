import { createTheme } from '@mantine/core';

export const adminWebTheme = createTheme({
  primaryColor: 'teal',
  defaultRadius: 'md',
  fontFamily: 'Aptos, "Segoe UI Variable", "Trebuchet MS", sans-serif',
  headings: {
    fontFamily: '"Aptos Display", Aptos, "Segoe UI Variable", sans-serif',
  },
  colors: {
    ink: [
      '#f2f5f7',
      '#dfe6ea',
      '#c4d1d8',
      '#a5b8c2',
      '#7f99a7',
      '#5d7787',
      '#425868',
      '#2a3a47',
      '#17232d',
      '#0a1218',
    ],
    moss: [
      '#edf7f1',
      '#d9ede2',
      '#b0dbc1',
      '#85c89e',
      '#5db77d',
      '#44ad69',
      '#329458',
      '#247347',
      '#175337',
      '#0a3422',
    ],
    brass: [
      '#fff7e8',
      '#f9e9c0',
      '#f1d58b',
      '#e8c053',
      '#e1ae26',
      '#dd9f08',
      '#bf8500',
      '#976700',
      '#6f4a00',
      '#472e00',
    ],
  },
});
