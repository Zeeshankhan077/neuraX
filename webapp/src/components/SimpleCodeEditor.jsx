import Editor from '@monaco-editor/react'

export default function SimpleCodeEditor({ value, onChange }) {
  const handleChange = (newValue) => {
    if (onChange) {
      onChange(newValue || '')
    }
  }

  return (
    <Editor
      height="400px"
      defaultLanguage="python"
      value={value}
      onChange={handleChange}
      theme="vs-dark"
      options={{
        minimap: { enabled: false },
        fontSize: 14,
        lineNumbers: 'on',
        scrollBeyondLastLine: false,
        automaticLayout: true,
      }}
    />
  )
}


