# quill-image-vbd

how to work this package on Next.js project

```js
"use client";

import React, { Component } from "react";
import dynamic from "next/dynamic";
import "react-quill/dist/quill.snow.css"; // Ensure this import is here

// Dynamically import ReactQuill so it only renders on the client
const ReactQuill = dynamic(() => import("react-quill"), { ssr: false });

// Dynamically import the ImageUploader module
const ImageUploader = dynamic(() => import("./src/quill.imageuploader"), {
    ssr: false,
});

const apiKey = "YourApiKeyHere"

class Editor extends Component {
    constructor(props) {
        super(props);
        this.state = {
            text: "",
            errors: {},
            loading: false,
            success: false,
            message: "",
            contents: [],
            editorHeight: 300, // Default height for the editor
        };
    }

    modules = {
        toolbar: [
            [{ header: [1, 2, 3, 4, 5, 6, false] }],
            ["bold", "italic", "underline", "strike"],
            ["blockquote"],
            ["image", "link"],
        ],
        imageUploader: {
            upload: (file) => {
                return new Promise((resolve, reject) => {
                    const formData = new FormData();
                    formData.append("image", file);

                    fetch(
                        `https://api.imgbb.com/1/upload?key=${apiKey}`,
                        {
                            method: "POST",
                            body: formData,
                        },
                    )
                        .then((response) => response.json())
                        .then((result) => {
                            console.log(result);
                            resolve(result.data.url);
                        })
                        .catch((error) => {
                            reject("Upload failed");
                            console.error("Error:", error);
                        });
                });
            },
        },
    };

    formats = [
        "header",
        "bold",
        "italic",
        "underline",
        "strike",
        "blockquote",
        "list",
        "bullet",
        "indent",
        "link",
        "image",
    ];

    componentDidMount() {
        // Register ImageUploader after ReactQuill is available
        const Quill = require("react-quill").Quill; // Use require to ensure it loads correctly
        Quill.register("modules/imageUploader", ImageUploader);

        const savedContent = localStorage.getItem("contents");
        if (savedContent) {
            this.setState({ contents: JSON.parse(savedContent) });
        }
    }

    handleChange = (value) => {
        this.setState({ text: value });
    };

    handleSave = () => {
        const savedContent = localStorage.getItem("contents");
        let contentsArray = savedContent ? JSON.parse(savedContent) : [];

        this.setState({
            errors: {},
            loading: true,
            success: false,
            message: "",
        });

        contentsArray.push({ content: this.state.text });
        localStorage.setItem("contents", JSON.stringify(contentsArray));

        this.setState({
            success: true,
            message: "Content saved successfully!",
            loading: false,
            text: "", // Clear the editor
        });
    };

    render() {
        return (
            <div>
                <div className='max-w-[700px] mx-auto p-4 border'>
                    <h4>React Quill Editor</h4>
                    {this.state.success && (
                        <p className='text-green-500'>{this.state.message}</p>
                    )}
                    <ReactQuill
                        style={{ height: `${this.state.editorHeight}px` }}
                        placeholder='Enter text here'
                        theme='snow'
                        modules={this.modules}
                        formats={this.formats}
                        value={this.state.text}
                        onChange={this.handleChange}
                    />
                    {this.state.errors.error && (
                        <p className='text-red-500'>
                            {this.state.errors.error}
                        </p>
                    )}
                    <div className='mt-4'>
                        <button
                            onClick={this.handleSave}
                            className='mt-4 p-2 bg-blue-500 text-white'
                        >
                            {this.state.loading ? "Saving..." : "Save"}
                        </button>
                    </div>
                </div>

                <div className='container mx-auto'>
                    {this.state.contents.map((content, index) => (
                        <div key={index} className='mt-4'>
                            <div
                                dangerouslySetInnerHTML={{
                                    __html: content.content,
                                }}
                            />
                        </div>
                    ))}
                </div>
            </div>
        );
    }
}

export default Editor;
```
