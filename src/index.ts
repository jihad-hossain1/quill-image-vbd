import Quill from 'quill';
import Delta from 'quill-delta'; // Ensure this is installed as a dependency
import LoadingImage from './bloats/images.js'; // Adjust the path if necessary

// Define RangeStatic if not available
interface RangeStatic {
  index: number;
  length: number;
}

// Define the Toolbar interface
interface Toolbar {
  addHandler(eventName: string, handler: Function): void;
  // Add other methods if needed
}

// Extend Quill's type definitions to include Toolbar
declare module 'quill' {
  interface Quill {
    getModule(name: string): Toolbar | any;
  }
}

interface ImageUploaderOptions {
  upload: (file: File) => Promise<string>;
}

class ImageUploader {
  private quill: Quill;
  private options: ImageUploaderOptions;
  private range: RangeStatic | null;
  private placeholderDelta: Delta | null;
  private fileHolder: HTMLInputElement | null;

  constructor(quill: Quill, options: ImageUploaderOptions) {
    this.quill = quill;
    this.options = options;
    this.range = null;
    this.placeholderDelta = null;
    this.fileHolder = null;

    if (typeof this.options.upload !== 'function') {
      console.warn('[Missing config] upload function that returns a promise is required');
    }

    const toolbar: Toolbar | any = this.quill.getModule('toolbar');
    if (toolbar) {
      toolbar.addHandler('image', this.selectLocalImage.bind(this));
    }

    this.handleDrop = this.handleDrop.bind(this);
    this.handlePaste = this.handlePaste.bind(this);

    this.quill.root.addEventListener('drop', this.handleDrop, false);
    this.quill.root.addEventListener('paste', this.handlePaste, false);
  }

  selectLocalImage(): void {
    this.quill.focus();
    this.range = this.quill.getSelection();

    this.fileHolder = document.createElement('input');
    this.fileHolder.setAttribute('type', 'file');
    this.fileHolder.setAttribute('accept', 'image/*');
    this.fileHolder.setAttribute('style', 'visibility:hidden');

    this.fileHolder.onchange = this.fileChanged.bind(this);

    document.body.appendChild(this.fileHolder);
    this.fileHolder.click();

    window.requestAnimationFrame(() => {
      if (this.fileHolder) document.body.removeChild(this.fileHolder);
    });
  }

  handleDrop(evt: DragEvent): void {
    if (evt.dataTransfer && evt.dataTransfer.files && evt.dataTransfer.files.length) {
      evt.stopPropagation();
      evt.preventDefault();
      const file = evt.dataTransfer.files[0];

      const selection = document.getSelection();
      if (selection) {
        const range = document.caretRangeFromPoint
          ? document.caretRangeFromPoint(evt.clientX, evt.clientY)
          : (document as any).caretPositionFromPoint(evt.clientX, evt.clientY)?.range;

        if (range) {
          selection.setBaseAndExtent(
            range.startContainer,
            range.startOffset,
            range.startContainer,
            range.startOffset
          );
        }
      }

      this.quill.focus();
      this.range = this.quill.getSelection();
      setTimeout(() => {
        this.quill.focus();
        this.range = this.quill.getSelection();
        this.readAndUploadFile(file);
      }, 0);
    }
  }

  handlePaste(evt: ClipboardEvent): void {
    const clipboard = evt.clipboardData || (window as any).clipboardData;

    if (clipboard && (clipboard.items || clipboard.files)) {
      const items = clipboard.items || clipboard.files;
      const IMAGE_MIME_REGEX = /^image\/(jpe?g|gif|png|svg|webp)$/i;

      for (let i = 0; i < items.length; i++) {
        if (IMAGE_MIME_REGEX.test(items[i].type)) {
          const file = items[i].getAsFile ? items[i].getAsFile() : (items[i] as any);
          if (file) {
            this.quill.focus();
            this.range = this.quill.getSelection();
            evt.preventDefault();
            setTimeout(() => {
              this.quill.focus();
              this.range = this.quill.getSelection();
              this.readAndUploadFile(file);
            }, 0);
          }
        }
      }
    }
  }

  readAndUploadFile(file: File): void {
    let isUploadReject = false;
    const fileReader = new FileReader();

    fileReader.addEventListener(
      'load',
      () => {
        if (!isUploadReject) {
          const base64ImageSrc = fileReader.result as string;
          this.insertBase64Image(base64ImageSrc);
        }
      },
      false
    );

    if (file) {
      fileReader.readAsDataURL(file);
    }

    this.options.upload(file).then(
      (imageUrl: string) => {
        this.insertToEditor(imageUrl);
      },
      (error: any) => {
        isUploadReject = true;
        this.removeBase64Image();
        console.warn(error);
      }
    );
  }

  fileChanged(): void {
    if (this.fileHolder) {
      const file = this.fileHolder.files?.[0];
      if (file) {
        this.readAndUploadFile(file);
      }
    }
  }

  insertBase64Image(url: string): void {
    if (this.range) {
      this.placeholderDelta = this.quill.insertEmbed(
        this.range.index,
        LoadingImage.blotName,
        `${url}`,
        'user'
      );
    }
  }

  insertToEditor(url: string): void {
    if (this.range) {
      const lengthToDelete = this.calculatePlaceholderInsertLength();

      // Delete the placeholder image
      this.quill.deleteText(this.range.index, lengthToDelete, 'user');
      // Insert the server-saved image
      this.quill.insertEmbed(this.range.index, 'image', url, 'user');

      this.range.index++;
      this.quill.setSelection(this.range, 'user');
    }
  }

  calculatePlaceholderInsertLength(): number {
    return this.placeholderDelta?.ops.reduce((accumulator: number, deltaOperation: any) => {
      if (deltaOperation.hasOwnProperty('insert')) {
        accumulator++;
      }
      return accumulator;
    }, 0) ?? 0;
  }

  removeBase64Image(): void {
    if (this.range) {
      const lengthToDelete = this.calculatePlaceholderInsertLength();
      this.quill.deleteText(this.range.index, lengthToDelete, 'user');
    }
  }

  // Optional: Add a destroy method to clean up event listeners
  destroy() {
    this.quill.root.removeEventListener('drop', this.handleDrop);
    this.quill.root.removeEventListener('paste', this.handlePaste);
  }
}

export default ImageUploader;
