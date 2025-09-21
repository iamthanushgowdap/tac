/**
 * @fileoverview This file initializes the Genkit AI instance with necessary plugins.
 * It ensures a single, configured AI object is used throughout the application.
 */
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

// Initialize Genkit with the Google AI plugin.
// This `ai` object is imported by all flows and other Genkit-related files.
export const ai = genkit({
  plugins: [googleAI()],
});
