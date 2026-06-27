import { render } from 'ink';
import App from './ui/components/App.js';

const { waitUntilExit } = render(<App />);

// Keep the process alive until the app exits
waitUntilExit().then(() => {
  process.exit(0);
});
