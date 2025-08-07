import { Component, Input, OnInit, OnChanges, ViewChild, ElementRef, Output, EventEmitter } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CodeHighlightService } from '../../services/code-highlight.service';

@Component({
  selector: 'app-code-display',
  standalone: false,
  templateUrl: './code-display.html',
  styleUrl: './code-display.scss'
})
export class CodeDisplay implements OnInit, OnChanges {
  @Input() code: string = '';
  @Input() language: string = 'csharp';
  @Input() title: string = 'Code';
  @Input() showHeader: boolean = true;
  @Input() showCopyButton: boolean = true;
  @Input() showFullScreenButton: boolean = true;
  @Input() showInfo: boolean = true;

  @Output() copied = new EventEmitter<string>();
  @Output() fullScreenToggled = new EventEmitter<boolean>();

  @ViewChild('codeElement', { static: false }) codeElement!: ElementRef<HTMLElement>;

  highlightedCode: string = '';
  isFullScreen: boolean = false;
  lineCount: number = 0;
  characterCount: number = 0;

  constructor(
    private codeHighlightService: CodeHighlightService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    this.processCode();
  }

  ngOnChanges() {
    this.processCode();
  }

  private processCode() {
    if (this.code) {
      this.highlightedCode = this.codeHighlightService.highlightCode(this.code, this.language);
      this.calculateStats();
    }
  }

  private calculateStats() {
    this.lineCount = this.code.split('\n').length;
    this.characterCount = this.code.length;
  }

  copyCode() {
    if (this.code) {
      navigator.clipboard.writeText(this.code).then(() => {
        this.snackBar.open('Code copied to clipboard!', 'Close', {
          duration: 2000,
          panelClass: ['success-snackbar']
        });
        this.copied.emit(this.code);
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
  }
}
