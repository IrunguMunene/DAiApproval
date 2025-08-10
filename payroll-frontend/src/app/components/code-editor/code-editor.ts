import { Component, Input, Output, EventEmitter, OnInit, OnChanges, OnDestroy, SimpleChanges, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MonacoEditorService } from '../../services/monaco-editor.service';
import type * as Monaco from 'monaco-editor';

export interface CompilationError {
  line: number;
  message: string;
  severity: 'error' | 'warning';
}

export interface SaveCodeEvent {
  code: string;
  modifiedBy: string;
}

@Component({
  selector: 'app-code-editor',
  standalone: false,
  templateUrl: './code-editor.html',
  styleUrl: './code-editor.scss'
})
export class CodeEditor implements OnInit, OnChanges, OnDestroy, AfterViewInit {
  @Input() code: string = '';
  @Input() originalCode: string = '';
  @Input() language: string = 'csharp';
  @Input() title: string = 'Code Editor';
  @Input() showHeader: boolean = true;
  @Input() showInfo: boolean = true;
  @Input() readonly: boolean = false;
  @Input() compilationErrors: CompilationError[] = [];
  @Input() isLoading: boolean = false;
  @Input() canSave: boolean = true;

  @Output() codeChanged = new EventEmitter<string>();
  @Output() saveCode = new EventEmitter<SaveCodeEvent>();
  @Output() resetCode = new EventEmitter<void>();
  @Output() compileCode = new EventEmitter<string>();
  @Output() copied = new EventEmitter<string>();
  @Output() fullScreenToggled = new EventEmitter<boolean>();

  @ViewChild('editorContainer', { static: false }) editorContainer!: ElementRef<HTMLDivElement>;

  private editor?: Monaco.editor.IStandaloneCodeEditor;
  private editorInitialized = false;

  currentCode: string = '';
  isFullScreen: boolean = false;
  lineCount: number = 0;
  characterCount: number = 0;
  hasChanges: boolean = false;
  isEditing: boolean = false;

  constructor(
    private monacoEditorService: MonacoEditorService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    this.currentCode = this.code;
    this.calculateStats();
    // Start in edit mode by default
    this.isEditing = true;
  }

  ngAfterViewInit() {
    // Use a timeout to ensure the view is fully rendered
    setTimeout(() => {
      this.initializeEditor();
    }, 100);
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['code'] && !changes['code'].isFirstChange()) {
      this.currentCode = this.code;
      this.hasChanges = false;
      this.updateEditorValue();
    }
    if (changes['compilationErrors'] && this.editor) {
      this.updateErrorMarkers();
    }
  }

  ngOnDestroy() {
    if (this.editor) {
      this.editor.dispose();
    }
  }

  private async initializeEditor() {
    if (!this.editorContainer || this.editorInitialized) {
      console.log('Skipping editor initialization - container missing or already initialized');
      return;
    }

    try {
      console.log('Initializing editor with code:', this.currentCode);
      console.log('Editor container dimensions:', 
        this.editorContainer.nativeElement.offsetWidth, 
        this.editorContainer.nativeElement.offsetHeight
      );

      // Ensure container has dimensions
      if (this.editorContainer.nativeElement.offsetHeight === 0) {
        this.editorContainer.nativeElement.style.height = '400px';
      }

      this.editor = await this.monacoEditorService.createEditor(
        this.editorContainer.nativeElement,
        this.currentCode,
        {
          readOnly: this.readonly,
          theme: 'vs',
          automaticLayout: true
        }
      );

      console.log('Editor created, setting up event handlers');

      // Listen for content changes
      this.editor.onDidChangeModelContent(() => {
        if (this.editor) {
          const newValue = this.editor.getValue();
          if (newValue !== this.currentCode) {
            this.currentCode = newValue;
            this.calculateStats();
            this.codeChanged.emit(this.currentCode);
            console.log('Code changed, new length:', this.currentCode.length);
          }
        }
      });

      this.editorInitialized = true;
      console.log('Editor initialization complete');
      
      // Update error markers after initialization
      setTimeout(() => {
        this.updateErrorMarkers();
      }, 100);
      
    } catch (error) {
      console.error('Failed to initialize Monaco Editor:', error);
      this.snackBar.open(`Monaco Editor failed to load. Using basic editor: ${error}`, 'Close', {
        duration: 8000,
        panelClass: ['warning-snackbar']
      });
      
      // Fall back to a basic textarea editor
      this.createFallbackEditor();
    }
  }

  private updateEditorValue() {
    if (this.editor) {
      this.editor.setValue(this.currentCode);
      this.calculateStats();
    }
  }

  private async updateErrorMarkers() {
    if (this.editor && this.compilationErrors.length > 0) {
      await this.monacoEditorService.setModelMarkers(this.editor, this.compilationErrors);
    } else if (this.editor) {
      await this.monacoEditorService.clearMarkers(this.editor);
    }
  }

  private calculateStats() {
    this.lineCount = this.currentCode.split('\n').length;
    this.characterCount = this.currentCode.length;
    this.hasChanges = this.currentCode !== this.code;
  }

  enterEditMode() {
    if (!this.readonly && this.editor) {
      this.isEditing = true;
      this.editor.updateOptions({ readOnly: false });
      this.editor.focus();
    }
  }

  exitEditMode() {
    if (this.editor) {
      this.isEditing = false;
      this.editor.updateOptions({ readOnly: true });
    }
  }

  copyCode() {
    if (this.currentCode) {
      navigator.clipboard.writeText(this.currentCode).then(() => {
        this.snackBar.open('Code copied to clipboard!', 'Close', {
          duration: 2000,
          panelClass: ['success-snackbar']
        });
        this.copied.emit(this.currentCode);
      }).catch(() => {
        this.snackBar.open('Failed to copy code', 'Close', {
          duration: 2000,
          panelClass: ['error-snackbar']
        });
      });
    }
  }

  toggleFullScreen() {
    this.isFullScreen = !this.isFullScreen;
    this.fullScreenToggled.emit(this.isFullScreen);
    
    // Trigger layout update after fullscreen toggle
    setTimeout(() => {
      if (this.editor) {
        this.editor.layout();
      }
    }, 100);
  }

  onSave() {
    if (!this.hasChanges) {
      this.snackBar.open('No changes to save', 'Close', {
        duration: 2000,
        panelClass: ['warning-snackbar']
      });
      return;
    }

    console.log('Save button clicked, emitting saveCode event');
    console.log('Current code to save:', this.currentCode);

    this.saveCode.emit({
      code: this.currentCode,
      modifiedBy: 'demo-user' // This should come from auth service in real app
    });
  }

  onReset() {
    if (this.hasChanges) {
      const confirmed = confirm('Are you sure you want to reset all changes? This cannot be undone.');
      if (confirmed) {
        this.currentCode = this.originalCode || this.code;
        this.updateEditorValue();
        this.resetCode.emit();
        this.exitEditMode();
      }
    }
  }

  onCompile() {
    this.compileCode.emit(this.currentCode);
  }

  private createFallbackEditor() {
    console.log('Creating fallback textarea editor');
    
    const container = this.editorContainer.nativeElement;
    container.innerHTML = ''; // Clear any existing content
    
    const textarea = document.createElement('textarea');
    textarea.value = this.currentCode;
    textarea.style.width = '100%';
    textarea.style.height = '100%';
    textarea.style.border = 'none';
    textarea.style.outline = 'none';
    textarea.style.resize = 'none';
    textarea.style.fontFamily = "'Courier New', monospace";
    textarea.style.fontSize = '13px';
    textarea.style.padding = '10px';
    textarea.style.backgroundColor = '#fafafa';
    textarea.style.color = '#333';
    
    // Add event listener for changes
    textarea.addEventListener('input', (event) => {
      const target = event.target as HTMLTextAreaElement;
      this.currentCode = target.value;
      this.calculateStats();
      this.codeChanged.emit(this.currentCode);
    });
    
    container.appendChild(textarea);
    this.editorInitialized = true;
    
    // Focus the textarea
    setTimeout(() => {
      textarea.focus();
    }, 100);
  }
}