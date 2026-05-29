"use client";

import { Play } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { extractImagesFromJson } from "@/lib/mcp/tool-result";
import type { MessageImage } from "@/types/chat";
import type { McpField } from "@/types/mcp";

type McpTesterProps = {
  name: string;
  description?: string;
  fields: McpField[];
  onRun: (inputs: Record<string, string>) => Promise<string>;
};

function ResultImages({ images }: { images: MessageImage[] }) {
  return (
    <div className="flex flex-col gap-2">
      {images.map((image, index) => (
        // eslint-disable-next-line @next/next/no-img-element -- MCP base64 인라인 이미지
        <img
          key={`${image.mimeType}-${index}`}
          src={`data:${image.mimeType};base64,${image.data}`}
          alt={`Tool result ${index + 1}`}
          className="max-h-80 max-w-full rounded-md border object-contain"
        />
      ))}
    </div>
  );
}

export function McpTester({ name, description, fields, onRun }: McpTesterProps) {
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [result, setResult] = useState<string | null>(null);
  const [resultImages, setResultImages] = useState<MessageImage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  const handleRun = async () => {
    setRunning(true);
    setError(null);
    setResult(null);
    setResultImages([]);
    try {
      const raw = await onRun(inputs);
      setResult(raw);
      setResultImages(extractImagesFromJson(raw));
    } catch (e) {
      setError(e instanceof Error ? e.message : "실행에 실패했습니다.");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-muted/20 p-3">
      <div>
        <p className="font-mono text-sm font-medium break-all">{name}</p>
        {description && (
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        )}
      </div>

      {fields.length > 0 && (
        <div className="flex flex-col gap-2">
          {fields.map((field) => (
            <div key={field.name} className="flex flex-col gap-1">
              <Label htmlFor={`field-${field.name}`} className="text-xs">
                {field.name}
                {field.required && <span className="text-destructive">*</span>}
                <span className="font-normal text-muted-foreground">
                  {field.type}
                </span>
              </Label>
              {field.type === "object" || field.type === "array" ? (
                <Textarea
                  id={`field-${field.name}`}
                  value={inputs[field.name] ?? ""}
                  onChange={(e) =>
                    setInputs((prev) => ({
                      ...prev,
                      [field.name]: e.target.value,
                    }))
                  }
                  placeholder={field.description ?? "JSON"}
                  rows={2}
                  className="resize-none font-mono text-xs"
                />
              ) : (
                <Input
                  id={`field-${field.name}`}
                  value={inputs[field.name] ?? ""}
                  onChange={(e) =>
                    setInputs((prev) => ({
                      ...prev,
                      [field.name]: e.target.value,
                    }))
                  }
                  placeholder={field.description}
                />
              )}
            </div>
          ))}
        </div>
      )}

      <Button
        size="sm"
        onClick={handleRun}
        disabled={running}
        className="self-start"
      >
        <Play className="size-3.5" />
        {running ? "실행 중..." : "테스트 실행"}
      </Button>

      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </p>
      )}

      {resultImages.length > 0 ? <ResultImages images={resultImages} /> : null}

      {result && (
        <pre className="max-h-80 overflow-auto rounded-md bg-background p-3 text-xs ring-1 ring-foreground/10">
          {result}
        </pre>
      )}
    </div>
  );
}
