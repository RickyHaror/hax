import { render } from 'preact';
import '@fontsource/atkinson-hyperlegible/400.css';
import '@fontsource/atkinson-hyperlegible/700.css';
import '@fontsource/jetbrains-mono/400.css';
import './styles/base.css';
import { App } from './ui/App';

const root = document.getElementById('app');
if (root) render(<App />, root);
