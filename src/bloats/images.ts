import Quill from "quill";

// Explicitly assert BlockEmbed as any to avoid the constructor issue
const BlockEmbed = Quill.import('blots/block/embed') as any;

// Define the type for the dataset used in the image blot
interface ImageBlotDataset extends DOMStringMap {
  src?: string;
  custom?: string;
}

class LoadingImage extends BlockEmbed {
  static create(src: string | boolean): HTMLElement {
    const node = super.create() as HTMLElement;
    if (src === true) return node;

    const image = document.createElement("img");
    image.setAttribute("src", src as string); // Explicitly cast src to string
    node.appendChild(image);
    return node;
  }

  deleteAt(index: number, length: number): void {
    super.deleteAt(index, length);
    (this as any).cache = {};  // Optional caching mechanism
  }

  static value(domNode: HTMLElement): { src?: string; custom?: string } {
    const dataset = domNode.dataset as ImageBlotDataset;
    const { src, custom } = dataset;
    return { src, custom };
  }
}

LoadingImage.blotName = "imageBlot";
LoadingImage.className = "image-uploading";
LoadingImage.tagName = "span";

// Register the custom blot with Quill
Quill.register({ "formats/imageBlot": LoadingImage });

export default LoadingImage;