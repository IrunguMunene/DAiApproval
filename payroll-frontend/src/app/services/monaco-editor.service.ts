import { Injectable } from '@angular/core';
import loader from '@monaco-editor/loader';
import type * as Monaco from 'monaco-editor';

@Injectable({
  providedIn: 'root'
})
export class MonacoEditorService {
  private monaco?: typeof Monaco;
  private isInitialized = false;

  constructor() {
    // Configure Monaco Editor loader to use CDN
    loader.config({
      'vs/nls': {
        availableLanguages: {
          '*': 'en'
        }
      }
    });
    
    // Set the paths to use CDN
    loader.config({
      paths: {
        vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs'
      }
    });
  }

  async getMonaco(): Promise<typeof Monaco> {
    if (this.monaco && this.isInitialized) {
      return this.monaco;
    }

    try {
      console.log('Initializing Monaco Editor from CDN...');
      
      // Add a small delay to ensure DOM is ready
      await new Promise(resolve => setTimeout(resolve, 100));
      
      this.monaco = await loader.init();
      
      // Configure C# language settings
      if (this.monaco) {
        console.log('Monaco Editor loaded successfully from CDN');
        
        // Enhanced C# language configuration
        this.monaco.languages.setLanguageConfiguration('csharp', {
          brackets: [
            ['{', '}'],
            ['[', ']'],
            ['(', ')']
          ],
          autoClosingPairs: [
            { open: '{', close: '}' },
            { open: '[', close: ']' },
            { open: '(', close: ')' },
            { open: '"', close: '"' },
            { open: "'", close: "'" }
          ],
          surroundingPairs: [
            { open: '{', close: '}' },
            { open: '[', close: ']' },
            { open: '(', close: ')' },
            { open: '"', close: '"' },
            { open: "'", close: "'" }
          ],
          comments: {
            lineComment: '//',
            blockComment: ['/*', '*/']
          },
          folding: {
            markers: {
              start: new RegExp('^\\s*#region\\b'),
              end: new RegExp('^\\s*#endregion\\b')
            }
          }
        });
        
        this.isInitialized = true;
      }

      return this.monaco as typeof Monaco;
    } catch (error) {
      console.error('Failed to initialize Monaco Editor from CDN:', error);
      console.log('Falling back to basic editor...');
      throw new Error(`Monaco Editor initialization failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async createEditor(
    container: HTMLElement, 
    value: string, 
    options: Partial<Monaco.editor.IStandaloneEditorConstructionOptions> = {}
  ): Promise<Monaco.editor.IStandaloneCodeEditor> {
    try {
      console.log('Creating Monaco editor with value:', value ? `${value.length} characters` : 'empty');
      const monaco = await this.getMonaco();
      
      const defaultOptions: Monaco.editor.IStandaloneEditorConstructionOptions = {
        value,
        language: 'csharp',
        theme: 'vs',
        automaticLayout: true,
        fontSize: 13,
        fontFamily: "'Courier New', monospace",
        lineNumbers: 'on',
        roundedSelection: false,
        scrollBeyondLastLine: false,
        minimap: { enabled: false },
        folding: true,
        lineDecorationsWidth: 10,
        lineNumbersMinChars: 3,
        glyphMargin: false,
        wordWrap: 'on',
        ...options
      };

      console.log('Creating editor with options:', defaultOptions);
      const editor = monaco.editor.create(container, defaultOptions);
      console.log('Editor created successfully');
      return editor;
    } catch (error) {
      console.error('Failed to create Monaco editor:', error);
      throw error;
    }
  }

  async setModelMarkers(
    editor: Monaco.editor.IStandaloneCodeEditor,
    errors: Array<{ line: number; message: string; severity: 'error' | 'warning' }>
  ): Promise<void> {
    const monaco = await this.getMonaco();
    const model = editor.getModel();
    if (!model) return;

    const markers = errors.map(error => ({
      startLineNumber: error.line,
      startColumn: 1,
      endLineNumber: error.line,
      endColumn: model.getLineMaxColumn(error.line),
      message: error.message,
      severity: error.severity === 'error' 
        ? monaco.MarkerSeverity.Error 
        : monaco.MarkerSeverity.Warning,
      source: 'C# Compiler'
    }));

    monaco.editor.setModelMarkers(model, 'csharp-compiler', markers);
  }

  async clearMarkers(editor: Monaco.editor.IStandaloneCodeEditor): Promise<void> {
    const monaco = await this.getMonaco();
    const model = editor.getModel();
    if (!model) return;

    monaco.editor.setModelMarkers(model, 'csharp-compiler', []);
  }
}