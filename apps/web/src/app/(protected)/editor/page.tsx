"use client";

import { SimpleEditor } from "@/components/tiptap-templates/simple/simple-editor";
import { Button } from "@/components/ui/button";
import { Save, Download, Upload, Eye, Code as CodeIcon } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useCallback } from "react";
import { toast } from "sonner";

export default function TiptapEditorPage() {
  const [viewMode, setViewMode] = useState<'editor' | 'preview' | 'json'>('editor');
  const [editor, setEditor] = useState<any>(null);
  const [editorContent, setEditorContent] = useState<any>(null);
  const [editorHTML, setEditorHTML] = useState<string>('');

  const handleEditorReady = useCallback((editorInstance: any) => {
    setEditor(editorInstance);

    const updateContent = () => {
      setEditorContent(editorInstance.getJSON());
      setEditorHTML(editorInstance.getHTML());
    };

    editorInstance.on('update', updateContent);

    updateContent();
  }, []);

  const saveEditorData = async () => {
    try {
      if (editor) {
        const content = editor.getJSON();
        console.log('Saving editor content:', content);
        toast.success('Editor data saved successfully!');
      } else {
        toast.error('Editor not ready');
      }
    } catch (error) {
      toast.error('Failed to save editor data');
    }
  };

  const exportAsJSON = () => {
    try {
      if (editor) {
        const content = editor.getJSON();
        const dataStr = JSON.stringify(content, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'editor-content.json';
        link.click();
        URL.revokeObjectURL(url);
        toast.success('Content exported successfully!');
      } else {
        toast.error('Editor not ready');
      }
    } catch (error) {
      toast.error('Failed to export content');
    }
  };

  return (
    <div className="h-screen flex flex-col">
      <div className="flex items-center justify-between p-4 border-b">
        <h1 className="text-2xl font-bold">Tiptap Simple Editor</h1>
        <div className="flex gap-2">
          <Button
            onClick={saveEditorData}
            size="sm"
            variant="outline"
          >
            <Save className="w-4 h-4 mr-2" />
            Save
          </Button>
          <Button
            onClick={exportAsJSON}
            size="sm"
            variant="outline"
          >
            <Download className="w-4 h-4 mr-2" />
            Export JSON
          </Button>
        </div>
      </div>

      <Tabs value={viewMode} onValueChange={(value) => {
        setViewMode(value as any);
      }} className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="editor" className="flex items-center gap-2">
            <CodeIcon className="w-4 h-4" />
            Editor
          </TabsTrigger>
          <TabsTrigger value="preview" className="flex items-center gap-2">
            <Eye className="w-4 h-4" />
            Preview
          </TabsTrigger>
          <TabsTrigger value="json" className="flex items-center gap-2">
            <CodeIcon className="w-4 h-4" />
            JSON
          </TabsTrigger>
        </TabsList>

        <TabsContent value="editor" className="flex-1">
          <SimpleEditor onEditorReady={handleEditorReady} />
        </TabsContent>

        <TabsContent value="preview" className="flex-1">
          <div className="border rounded-lg p-4 h-full bg-background overflow-auto">
            <div className="prose max-w-none">
              <h2 className="mb-4">Preview Mode</h2>
              {editorHTML ? (
                <div
                  className="prose max-w-none"
                  dangerouslySetInnerHTML={{ __html: editorHTML }}
                />
              ) : (
                <p className="text-muted-foreground">Start typing in the editor to see the preview...</p>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="json" className="flex-1">
          <div className="border rounded-lg p-4 h-full">
            <h2 className="mb-4">JSON Export</h2>
            <pre className="text-sm overflow-auto h-full bg-muted p-4 rounded-lg">
              {editorContent ? JSON.stringify(editorContent, null, 2) : 'Start typing in the editor to see the JSON structure...'}
            </pre>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}