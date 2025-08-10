import { Component, Input, OnInit, OnChanges, ViewChild, ElementRef, Output, EventEmitter, AfterViewInit, OnDestroy } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CodeHighlightService } from '../../services/code-highlight.service';
import { ApiService } from '../../services/api.service';
import { UpdateRuleCodeRequest, UpdateRuleCodeResponse } from '../../models/rule.model';
import loader from '@monaco-editor/loader';

declare const monaco: typeof import('monaco-editor');

@Component({
  selector: 'app-code-display',
  standalone: false,
  templateUrl: './code-display.html',
  styleUrl: './code-display.scss'
})
export class CodeDisplay implements OnInit, OnChanges, AfterViewInit, OnDestroy {
  @Input() code: string = '';
  @Input() language: string = 'csharp';
  @Input() title: string = 'Code';
  @Input() showHeader: boolean = true;
  @Input() showCopyButton: boolean = true;
  @Input() showFullScreenButton: boolean = true;
  @Input() showInfo: boolean = true;
  @Input() editable: boolean = false;
  @Input() ruleId: string | null = null;

  @Output() copied = new EventEmitter<string>();
  @Output() fullScreenToggled = new EventEmitter<boolean>();
  @Output() codeChanged = new EventEmitter<string>();
  @Output() codeSaved = new EventEmitter<{ruleId: string, code: string}>();

  @ViewChild('codeElement', { static: false }) codeElement!: ElementRef<HTMLElement>;
  @ViewChild('monacoContainer', { static: false }) monacoContainer!: ElementRef<HTMLDivElement>;

  highlightedCode: string = '';
  isFullScreen: boolean = false;
  lineCount: number = 0;
  characterCount: number = 0;
  isEditing: boolean = false;
  isSaving: boolean = false;
  hasUnsavedChanges: boolean = false;
  monacoEditor: any = null; // We'll type this properly after Monaco loads
  currentCode: string = '';

  constructor(
    private codeHighlightService: CodeHighlightService,
    private snackBar: MatSnackBar,
    private apiService: ApiService
  ) {}

  ngOnInit() {
    this.currentCode = this.code;
    this.processCode();
  }

  ngOnChanges() {
    if (this.code !== this.currentCode) {
      this.currentCode = this.code;
      this.processCode();
      if (this.monacoEditor && !this.isEditing) {
        this.monacoEditor.setValue(this.code);
      }
    }
  }

  ngAfterViewInit() {
    // Monaco editor will be initialized when entering edit mode
  }

  ngOnDestroy() {
    if (this.monacoEditor) {
      this.monacoEditor.dispose();
    }
  }

  private processCode() {
    if (this.currentCode) {
      this.highlightedCode = this.codeHighlightService.highlightCode(this.currentCode, this.language);
      this.calculateStats();
    }
  }

  private calculateStats() {
    this.lineCount = this.currentCode.split('\n').length;
    this.characterCount = this.currentCode.length;
  }

  copyCode() {
    const codeToCopy = this.isEditing && this.monacoEditor ? this.monacoEditor.getValue() : this.currentCode;
    if (codeToCopy) {
      navigator.clipboard.writeText(codeToCopy).then(() => {
        this.snackBar.open('Code copied to clipboard!', 'Close', {
          duration: 2000,
          panelClass: ['success-snackbar']
        });
        this.copied.emit(codeToCopy);
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
    
    // Resize Monaco editor if it's active
    if (this.monacoEditor) {
      setTimeout(() => {
        this.monacoEditor?.layout();
      }, 100);
    }
  }

  enterEditMode() {
    if (!this.editable) return;
    
    this.isEditing = true;
    this.hasUnsavedChanges = false;
    
    setTimeout(() => {
      this.initializeMonacoEditor();
    }, 10);
  }

  exitEditMode() {
    if (this.hasUnsavedChanges) {
      const confirmExit = confirm('You have unsaved changes. Are you sure you want to exit without saving?');
      if (!confirmExit) return;
    }

    this.isEditing = false;
    this.hasUnsavedChanges = false;
    
    if (this.monacoEditor) {
      this.monacoEditor.dispose();
      this.monacoEditor = null;
    }
  }

  private async initializeMonacoEditor() {
    if (!this.monacoContainer?.nativeElement) return;

    try {
      // Initialize Monaco Editor using the loader
      loader.config({ 
        paths: { 
          vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs' 
        } 
      });
      
      const monacoInstance = await loader.init();
      const container = this.monacoContainer.nativeElement;
      
      this.monacoEditor = monacoInstance.editor.create(container, {
        value: this.currentCode,
        language: this.getMonacoLanguage(),
        theme: 'vs-dark',
        automaticLayout: true,
        minimap: { enabled: false },
        fontSize: 14,
        lineNumbers: 'on',
        roundedSelection: false,
        scrollBeyondLastLine: false,
        wordWrap: 'on',
        folding: true,
        matchBrackets: 'always',
        autoIndent: 'full',
        formatOnPaste: true,
        formatOnType: true
      });

      this.monacoEditor.onDidChangeModelContent(() => {
        const newValue = this.monacoEditor?.getValue() || '';
        if (newValue !== this.currentCode) {
          this.hasUnsavedChanges = true;
          this.codeChanged.emit(newValue);
        }
      });

      // Add keyboard shortcuts
      this.monacoEditor.addCommand(monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.KeyS, () => {
        this.saveCode();
      });
    } catch (error) {
      console.error('Failed to initialize Monaco Editor:', error);
      this.snackBar.open('Failed to initialize code editor', 'Close', {
        duration: 3000,
        panelClass: ['error-snackbar']
      });
    }
  }

  private getMonacoLanguage(): string {
    switch (this.language.toLowerCase()) {
      case 'csharp':
      case 'c#':
        return 'csharp';
      case 'javascript':
      case 'js':
        return 'javascript';
      case 'typescript':
      case 'ts':
        return 'typescript';
      case 'json':
        return 'json';
      case 'xml':
        return 'xml';
      case 'sql':
        return 'sql';
      default:
        return 'plaintext';
    }
  }

  saveCode() {
    if (!this.monacoEditor || !this.ruleId || this.isSaving) return;

    const updatedCode = this.monacoEditor.getValue();
    if (updatedCode === this.currentCode) {
      this.snackBar.open('No changes to save', 'Close', { duration: 2000 });
      return;
    }

    this.isSaving = true;

    const request: UpdateRuleCodeRequest = {
      updatedCode: updatedCode,
      modifiedBy: 'demo-user' // In a real app, this would come from authentication
    };

    console.log('Code Display - Sending update request:', {
      ruleId: this.ruleId,
      request: request,
      updatedCodeLength: updatedCode.length,
      updatedCodePreview: updatedCode.substring(0, 200) + '...'
    });

    this.apiService.updateRuleCode(this.ruleId, request).subscribe({
      next: (response: UpdateRuleCodeResponse) => {
        this.isSaving = false;
        
        if (response.success) {
          this.hasUnsavedChanges = false;
          this.currentCode = updatedCode;
          this.code = updatedCode;
          this.calculateStats();
          
          let message = 'Code saved successfully!';
          if (response.compilationWarnings.length > 0) {
            message += ` (${response.compilationWarnings.length} warnings)`;
          }
          
          this.snackBar.open(message, 'Close', {
            duration: 3000,
            panelClass: ['success-snackbar']
          });
          
          // Emit success event for parent component
          this.codeSaved.emit({ ruleId: this.ruleId!, code: updatedCode });
        } else {
          // Handle compilation errors
          const errorMessage = response.hasCompilationErrors 
            ? `Compilation failed: ${response.compilationErrors.length} errors`
            : response.message;
            
          this.snackBar.open(errorMessage, 'Close', {
            duration: 5000,
            panelClass: ['error-snackbar']
          });
          
          // Show compilation errors in console for debugging
          if (response.compilationErrors.length > 0) {
            console.error('Compilation errors:', response.compilationErrors);
          }
        }
      },
      error: (error) => {
        this.isSaving = false;
        console.error('Save error:', error);
        this.snackBar.open('Failed to save code: ' + error.message, 'Close', {
          duration: 5000,
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  onCodeSaved(success: boolean, newCode?: string) {
    // This method is kept for backward compatibility
    // The actual save logic is now in saveCode() method above
    this.isSaving = false;
    
    if (success && newCode) {
      this.hasUnsavedChanges = false;
      this.currentCode = newCode;
      this.code = newCode;
      this.calculateStats();
      
      this.snackBar.open('Code saved successfully!', 'Close', {
        duration: 2000,
        panelClass: ['success-snackbar']
      });
    } else {
      this.snackBar.open('Failed to save code', 'Close', {
        duration: 2000,
        panelClass: ['error-snackbar']
      });
    }
  }
}
