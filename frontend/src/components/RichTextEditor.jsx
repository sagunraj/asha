import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import { useEffect, useImperativeHandle, forwardRef } from 'react'

// ── Toolbar button ─────────────────────────────────────────────────────────────
function ToolBtn({ onClick, active, title, children, disabled }) {
  return (
    <button
      type="button"
      onMouseDown={e => { e.preventDefault(); onClick() }}
      disabled={disabled}
      title={title}
      className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm transition-colors
        ${active
          ? 'bg-[#0071E3] text-white'
          : 'text-[#3A3A3C] dark:text-[#AEAEB2] hover:bg-[#F2F2F7] dark:hover:bg-[#3A3A3C]'}
        disabled:opacity-40`}
    >
      {children}
    </button>
  )
}

function Divider() {
  return <div className="w-px h-5 bg-gray-200 dark:bg-[#3A3A3C] mx-0.5 self-center" />
}

// ── Main editor ────────────────────────────────────────────────────────────────
const RichTextEditor = forwardRef(function RichTextEditor({ value, onChange }, ref) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // keep headings 1–3, bullet/ordered lists, blockquote, hr, bold, italic, code
      }),
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Link.configure({ openOnClick: false, HTMLAttributes: { class: 'text-[#0071E3] underline' } }),
      Image.configure({ inline: false, allowBase64: false }),
    ],
    content: value,
    onUpdate({ editor }) {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none min-h-[260px] px-4 py-3 focus:outline-none dark:prose-invert',
      },
    },
  })

  // Sync external value changes (e.g. reset when modal re-opens)
  useEffect(() => {
    if (!editor) return
    if (editor.getHTML() !== value) {
      editor.commands.setContent(value, false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value === '' || value === '<p></p>' ? value : null])

  // Expose insertContent so parents can insert placeholders at cursor
  useImperativeHandle(ref, () => ({
    insertContent(text) {
      editor?.chain().focus().insertContent(text).run()
    },
  }), [editor])

  if (!editor) return null

  const canLink = !editor.state.selection.empty

  function setLink() {
    const prev = editor.getAttributes('link').href || ''
    const url = window.prompt('URL', prev)
    if (url === null) return
    if (url === '') { editor.chain().focus().unsetLink().run(); return }
    editor.chain().focus().setLink({ href: url }).run()
  }

  function insertImage() {
    const url = window.prompt('Image URL')
    if (!url) return
    editor.chain().focus().setImage({ src: url }).run()
  }

  return (
    <div className="border border-gray-200 dark:border-[#3A3A3C] rounded-xl overflow-hidden bg-white dark:bg-[#1C1C1E]">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-gray-100 dark:border-[#3A3A3C] bg-[#F9F9F9] dark:bg-[#2C2C2E]">
        {/* Text styles */}
        <ToolBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold">
          <strong>B</strong>
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic">
          <em>I</em>
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Underline">
          <span className="underline">U</span>
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Strikethrough">
          <span className="line-through">S</span>
        </ToolBtn>

        <Divider />

        {/* Headings */}
        <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} title="Heading 1">
          <span className="text-xs font-bold">H1</span>
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="Heading 2">
          <span className="text-xs font-bold">H2</span>
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} title="Heading 3">
          <span className="text-xs font-bold">H3</span>
        </ToolBtn>

        <Divider />

        {/* Lists */}
        <ToolBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Bullet list">
          <svg viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4"><circle cx="2" cy="4" r="1.5"/><rect x="5" y="3" width="9" height="2" rx="1"/><circle cx="2" cy="8" r="1.5"/><rect x="5" y="7" width="9" height="2" rx="1"/><circle cx="2" cy="12" r="1.5"/><rect x="5" y="11" width="9" height="2" rx="1"/></svg>
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Numbered list">
          <svg viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4"><text x="0" y="5" fontSize="5" fontWeight="bold">1.</text><rect x="5" y="3" width="9" height="2" rx="1"/><text x="0" y="10" fontSize="5" fontWeight="bold">2.</text><rect x="5" y="8" width="9" height="2" rx="1"/><text x="0" y="15" fontSize="5" fontWeight="bold">3.</text><rect x="5" y="13" width="9" height="2" rx="1"/></svg>
        </ToolBtn>

        <Divider />

        {/* Alignment */}
        <ToolBtn onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} title="Align left">
          <svg viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4"><rect x="1" y="2" width="14" height="2" rx="1"/><rect x="1" y="6" width="10" height="2" rx="1"/><rect x="1" y="10" width="14" height="2" rx="1"/><rect x="1" y="14" width="8" height="2" rx="1"/></svg>
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} title="Center">
          <svg viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4"><rect x="1" y="2" width="14" height="2" rx="1"/><rect x="3" y="6" width="10" height="2" rx="1"/><rect x="1" y="10" width="14" height="2" rx="1"/><rect x="4" y="14" width="8" height="2" rx="1"/></svg>
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} title="Align right">
          <svg viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4"><rect x="1" y="2" width="14" height="2" rx="1"/><rect x="5" y="6" width="10" height="2" rx="1"/><rect x="1" y="10" width="14" height="2" rx="1"/><rect x="7" y="14" width="8" height="2" rx="1"/></svg>
        </ToolBtn>

        <Divider />

        {/* Extras */}
        <ToolBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="Blockquote">
          <svg viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4"><path d="M3 3h4v4H5a2 2 0 000 4v2H3V3zm6 0h4v4h-2a2 2 0 000 4v2H9V3z"/></svg>
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} active={false} title="Horizontal rule">
          <svg viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4"><rect x="1" y="7" width="14" height="2" rx="1"/></svg>
        </ToolBtn>
        <ToolBtn onClick={setLink} active={editor.isActive('link')} title="Insert link" disabled={!canLink && !editor.isActive('link')}>
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4"><path d="M6.5 9.5a3 3 0 004.243 0l2-2a3 3 0 00-4.243-4.243L7.5 4.257"/><path d="M9.5 6.5A3 3 0 005.257 6.5l-2 2a3 3 0 004.243 4.243L8.5 11.743"/></svg>
        </ToolBtn>
        <ToolBtn onClick={insertImage} active={false} title="Insert image from URL">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4"><rect x="1.5" y="2.5" width="13" height="11" rx="1.5"/><circle cx="5" cy="6" r="1.25"/><path d="M1.5 11l3.5-3.5 2.5 2.5 2-1.5L14.5 13" strokeLinejoin="round"/></svg>
        </ToolBtn>

        <Divider />

        {/* Undo / Redo */}
        <ToolBtn onClick={() => editor.chain().focus().undo().run()} active={false} title="Undo" disabled={!editor.can().undo()}>
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4"><path d="M3 7H9a3 3 0 010 6H6"/><path d="M3 7l3-3M3 7l3 3"/></svg>
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().redo().run()} active={false} title="Redo" disabled={!editor.can().redo()}>
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4"><path d="M13 7H7a3 3 0 000 6h3"/><path d="M13 7l-3-3M13 7l-3 3"/></svg>
        </ToolBtn>
      </div>

      {/* Editor area */}
      <EditorContent editor={editor} />
    </div>
  )
})

export default RichTextEditor
