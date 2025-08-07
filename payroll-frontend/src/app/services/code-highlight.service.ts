import { Injectable } from '@angular/core';
import 'prismjs';
import 'prismjs/components/prism-csharp';

declare const Prism: any;

@Injectable({
  providedIn: 'root'
})
export class CodeHighlightService {

  constructor() {}

  highlightCode(code: string, language: string = 'csharp'): string {
    if (typeof Prism !== 'undefined') {
      return Prism.highlight(code, Prism.languages[language] || Prism.languages.csharp, language);
    }
    return code;
  }

  highlightElement(element: HTMLElement): void {
    if (typeof Prism !== 'undefined') {
      Prism.highlightElement(element);
    }
  }

  highlightAll(): void {
    if (typeof Prism !== 'undefined') {
      Prism.highlightAll();
    }
  }
}