"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface FileDetail {
  filename: string;
  size: number;
  modified: string;
  url: string;
  accessibleAt: string;
}

export default function MediaTestPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [fileDirectory, setFileDirectory] = useState<string>("");
  const [uploadedFiles, setUploadedFiles] = useState<FileDetail[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);

  const addLog = (message: string) => {
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
    console.log(message);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    setFiles(selectedFiles);
    addLog(
      `Selected ${selectedFiles.length} file(s): ${selectedFiles.map((f) => `${f.name} (${f.size} bytes)`).join(", ")}`,
    );
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      addLog("ERROR: No files selected");
      return;
    }

    setUploading(true);
    addLog("Starting upload...");

    try {
      const formData = new FormData();
      files.forEach((file) => {
        addLog(`Adding to FormData: ${file.name} (${file.type})`);
        formData.append("files", file);
      });

      addLog("Sending request to /api/upload/media");
      const response = await fetch("/api/upload/media", {
        method: "POST",
        body: formData,
      });

      addLog(`Response status: ${response.status} ${response.statusText}`);

      const data = await response.json();
      addLog(`Response body: ${JSON.stringify(data, null, 2)}`);

      if (response.ok && data.urls) {
        setUploadedUrls(data.urls);
        addLog(`Upload successful! URLs: ${JSON.stringify(data.urls)}`);
        
        // Refresh file list after upload
        setTimeout(() => {
          loadUploadedFiles();
        }, 1000);
      } else {
        addLog(
          `Upload failed: ${data.error || "Unknown error"}`,
        );
      }
    } catch (error) {
      addLog(
        `ERROR: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      setUploading(false);
    }
  };

  const testFileAccess = async () => {
    addLog("Testing file access...");
    try {
      const response = await fetch("/api/upload/test-access");
      const data = await response.json();
      addLog(`File access test result: ${JSON.stringify(data, null, 2)}`);
      if (data.uploadDir) {
        setFileDirectory(data.uploadDir);
      }
    } catch (error) {
      addLog(
        `ERROR testing file access: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  };

  const loadUploadedFiles = async () => {
    setLoadingFiles(true);
    addLog("Loading uploaded files list...");
    try {
      const response = await fetch("/api/upload/list");
      const data = await response.json();
      addLog(`Loaded ${data.recentFiles?.length || 0} recent files`);
      setUploadedFiles(data.recentFiles || []);
    } catch (error) {
      addLog(
        `ERROR loading files: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      setLoadingFiles(false);
    }
  };

  useEffect(() => {
    // Load files on mount
    loadUploadedFiles();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Media Upload Test</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* File Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Images
              </label>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileSelect}
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-md file:border-0
                  file:text-sm file:font-semibold
                  file:bg-blue-50 file:text-blue-700
                  hover:file:bg-blue-100"
              />
              {files.length > 0 && (
                <p className="mt-2 text-sm text-gray-600">
                  {files.length} file(s) selected
                </p>
              )}
            </div>

            {/* Buttons */}
            <div className="flex gap-2 flex-wrap">
              <Button
                onClick={handleUpload}
                disabled={uploading || files.length === 0}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {uploading ? "Uploading..." : "Upload Files"}
              </Button>
              <Button
                onClick={testFileAccess}
                variant="outline"
              >
                Test File Access
              </Button>
              <Button
                onClick={loadUploadedFiles}
                disabled={loadingFiles}
                variant="outline"
              >
                {loadingFiles ? "Loading..." : "Refresh Files List"}
              </Button>
            </div>

            {/* File Directory Info */}
            {fileDirectory && (
              <div className="bg-green-50 border border-green-200 rounded p-3">
                <p className="text-sm text-green-800">
                  <span className="font-semibold">Upload Directory:</span> {fileDirectory}
                </p>
              </div>
            )}

            {/* Uploaded URLs */}
            {uploadedUrls.length > 0 && (
              <div className="space-y-2">
                <p className="font-semibold text-sm">Just Uploaded URLs:</p>
                {uploadedUrls.map((url, idx) => (
                  <div
                    key={idx}
                    className="bg-blue-50 border border-blue-200 rounded p-3"
                  >
                    <p className="text-sm text-blue-800 break-all">{url}</p>
                    <img
                      src={url}
                      alt={`Uploaded ${idx}`}
                      className="mt-2 max-h-40 rounded"
                      onError={() =>
                        addLog(`ERROR: Could not load image from ${url}`)
                      }
                      onLoad={() =>
                        addLog(`SUCCESS: Image loaded from ${url}`)
                      }
                    />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recently Uploaded Files */}
        <Card>
          <CardHeader>
            <CardTitle>Recently Uploaded Files ({uploadedFiles.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {uploadedFiles.length === 0 ? (
              <p className="text-sm text-gray-500">No files found</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {uploadedFiles.map((file, idx) => (
                  <div
                    key={idx}
                    className="border border-gray-200 rounded p-3 space-y-1"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-mono text-sm text-gray-700 break-all">
                          {file.filename}
                        </p>
                        <p className="text-xs text-gray-500">
                          {file.size} bytes • {new Date(file.modified).toLocaleString()}
                        </p>
                        <p className="text-xs text-blue-600 break-all">
                          {file.url}
                        </p>
                      </div>
                    </div>
                    <img
                      src={file.url}
                      alt={file.filename}
                      className="mt-2 max-h-24 rounded"
                      onError={() =>
                        addLog(`ERROR: Could not load ${file.filename}`)
                      }
                      onLoad={() =>
                        addLog(`SUCCESS: Loaded ${file.filename}`)
                      }
                    />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Logs */}
        <Card>
          <CardHeader>
            <CardTitle>Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-900 text-gray-100 p-4 rounded-lg max-h-96 overflow-y-auto font-mono text-sm space-y-1">
              {logs.length === 0 ? (
                <p className="text-gray-500">No logs yet</p>
              ) : (
                logs.map((log, idx) => (
                  <div key={idx} className="whitespace-pre-wrap break-words">
                    {log}
                  </div>
                ))
              )}
            </div>
            <Button
              onClick={() => setLogs([])}
              variant="outline"
              size="sm"
              className="mt-2"
            >
              Clear Logs
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
