# React Integration

Milkdown provides first-class React support with dedicated packages and hooks for seamless integration. You can choose between Crepe, our feature-rich WYSIWYG editor, or the core Milkdown editor for more customization options.

## Using Crepe

---

Crepe is a powerful, feature-rich Markdown editor built on top of Milkdown that provides a more user-friendly editing experience.

### Installation

```bash
npm install @milkdown/crepe @milkdown/react @milkdown/kit
```

### Implementation

```tsx
import { Crepe } from "@milkdown/crepe";
import { Milkdown, MilkdownProvider, useEditor } from "@milkdown/react";

const CrepeEditor: React.FC = () => {
  const { get } = useEditor((root) => {
    return new Crepe({ root });
  });

  return <Milkdown />;
};

export const MilkdownEditorWrapper: React.FC = () => {
  return (
    <MilkdownProvider>
      <CrepeEditor />
    </MilkdownProvider>
  );
};
```

### Online Demo

::iframe{src="https://stackblitz.com/github/Milkdown/examples/tree/main/react-crepe"}

## Using Milkdown

---

For more advanced use cases or when you need full control over the editor's configuration, you can use the core Milkdown editor directly.

### Install Dependencies

```bash
npm install @milkdown/react @milkdown/kit
```

### Basic Usage

Here's a minimal example to get started:

```tsx
import { Editor, rootCtx } from "@milkdown/kit/core";
import { commonmark } from "@milkdown/kit/preset/commonmark";
import { Milkdown, MilkdownProvider, useEditor } from "@milkdown/react";
import { nord } from "@milkdown/theme-nord";

const MilkdownEditor: React.FC = () => {
  const { get } = useEditor((root) =>
    Editor.make()
      .config(nord)
      .config((ctx) => {
        ctx.set(rootCtx, root);
      })
      .use(commonmark),
  );

  return <Milkdown />;
};

export const MilkdownEditorWrapper: React.FC = () => {
  return (
    <MilkdownProvider>
      <MilkdownEditor />
    </MilkdownProvider>
  );
};
```

::iframe{src="https://stackblitz.com/github/Milkdown/examples/tree/main/react-commonmark"}

## Advanced Usage

---

### Accessing Editor Instance

The `useInstance()` hook can only be used within components that are children of `MilkdownProvider`. It returns a tuple containing a loading state and a getter function to access the editor instance.

```tsx
import { useInstance } from "@milkdown/react";
import { getMarkdown } from "@milkdown/utils";

// ❌ This won't work - ParentComponent is outside MilkdownProvider
const ParentComponent: React.FC = () => {
  const [isLoading, getInstance] = useInstance(); // This will be [true, () => undefined]
  return <MilkdownEditorWrapper />;
};

// ✅ This is the correct way - EditorControls is inside MilkdownProvider
const EditorControls: React.FC = () => {
  const [isLoading, getInstance] = useInstance();

  const handleSave = () => {
    if (isLoading) return;

    const editor = getInstance();
    if (!editor) return;

    const content = editor.action(getMarkdown());
    // Do something with the content
  };

  return (
    <button onClick={handleSave} disabled={isLoading}>
      Save
    </button>
  );
};

// ✅ Proper component structure
const EditorWithControls: React.FC = () => {
  return (
    <MilkdownProvider>
      <MilkdownEditorWrapper />
      <EditorControls />
    </MilkdownProvider>
  );
};
```

### Best Practices

1. **Component Structure**
   - Keep the editor component separate from business logic
   - Wrap the editor with `MilkdownProvider` at the highest necessary level
   - Use TypeScript for better type safety

2. **Performance**
   - Memoize the editor configuration if it's complex
   - Use React.memo for the editor component if needed
   - Avoid unnecessary re-renders of the editor

### Common Use Cases

**Form Integration**

```tsx
const FormWithEditor: React.FC = () => {
  const [isLoading, getInstance] = useInstance();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    const editor = getInstance();
    if (!editor) return;

    const content = editor.action(getMarkdown());
    // Submit form with content
  };

  return (
    <form onSubmit={handleSubmit}>
      <MilkdownEditorWrapper />
      <button type="submit" disabled={isLoading}>
        Submit
      </button>
    </form>
  );
};
```

**Auto-save**

```tsx
import { Editor, rootCtx } from "@milkdown/kit/core";
import { commonmark } from "@milkdown/kit/preset/commonmark";
import { listener, listenerCtx } from "@milkdown/kit/plugin/listener";
import { Milkdown, useEditor } from "@milkdown/react";

const AutoSaveEditor: React.FC = () => {
  const { get } = useEditor((root) =>
    Editor.make()
      .config((ctx) => {
        ctx.set(rootCtx, root);
        // Add markdown listener for auto-save
        ctx.get(listenerCtx).markdownUpdated((ctx, markdown) => {
          // Save content to your backend or storage
          saveToBackend(markdown);
        });
      })
      .use(commonmark)
      .use(listener),
  );

  return <Milkdown />;
};
```

## More Examples

---

- [Examples Repository](https://github.com/Milkdown/examples)