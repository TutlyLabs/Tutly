"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { Account } from "@prisma/client";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { api } from "@/trpc/react";
import Image from "next/image";

export const GeminiIntegration = ({
  gemini,
}: {
  gemini?: Account | undefined;
}) => {
  const formSchema = z.object({
    apiKey: z.string().min(1, "API key is required"),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { apiKey: gemini?.accessToken || "" },
  });

  const [checking, setChecking] = useState(false);
  const [showChecks, setShowChecks] = useState(false);
  const [results, setResults] = useState<{
    validation: {
      ok: boolean | null;
      error?: string;
      modelsCount?: number;
      models?: string[];
    } | null;
  }>({
    validation: null,
  });
  const [editMode, setEditMode] = useState(!gemini);
  const inputRef = useRef<HTMLInputElement>(null);

  // tRPC mutations
  const validateApiKeyMutation = api.gemini.validateApiKey.useMutation();
  const saveAccountMutation = api.gemini.saveGeminiAccount.useMutation();

  function handleEdit() {
    setEditMode(true);
    form.setValue("apiKey", "");
  }

  useEffect(() => {
    if (editMode && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editMode]);

  async function onValidate(values: z.infer<typeof formSchema>) {
    setChecking(true);
    setShowChecks(true);
    setResults({ validation: null });

    try {
      // Validate API key
      setResults((prev) => ({ ...prev, validation: { ok: null } }));
      const validateResult = await validateApiKeyMutation.mutateAsync({
        apiKey: values.apiKey,
      });

      if (validateResult.ok) {
        setResults((prev) => ({
          ...prev,
          validation: {
            ok: true,
            modelsCount: validateResult.modelsCount,
            models: validateResult.models,
          },
        }));

        await new Promise((resolve) => setTimeout(resolve, 5000));

        // Save the account
        try {
          const saveResult = await saveAccountMutation.mutateAsync({
            apiKey: values.apiKey,
          });
          if (saveResult.ok) {
            toast.success(
              "Gemini API key is valid and has been saved successfully!",
            );
            setEditMode(false);
          } else {
            toast.error("API key validated but failed to save in database.");
          }
        } catch (e) {
          toast.error("API key validated but error saving in database.");
        }
      } else {
        setResults((prev) => ({
          ...prev,
          validation: {
            ok: false,
            error: validateResult.error || "Validation failed",
          },
        }));

        await new Promise((resolve) => setTimeout(resolve, 5000));

        toast.error(validateResult.error || "API key validation failed.");
      }
    } catch (err: any) {
      toast.error(
        err?.message || "An unexpected error occurred during validation.",
      );
      setResults((prev) => ({
        ...prev,
        validation: {
          ok: false,
          error: err?.message || "Unexpected error",
        },
      }));
    } finally {
      setChecking(false);
    }
  }

  return (
    <Accordion type="single" collapsible className="mt-8 w-full">
      <AccordionItem value="gemini">
        <AccordionTrigger className="flex flex-row items-center gap-4 p-4">
          <div className="flex flex-row items-center gap-4">
            <Image
              src="/integrations/gemini.png"
              alt="Gemini"
              width={28}
              height={28}
              className="h-7 w-7"
            />
            <span className="text-lg font-semibold">Gemini API</span>
          </div>
        </AccordionTrigger>
        <AccordionContent className="p-4 pt-0">
          <div className="flex flex-col gap-2">
            <div className="mb-4 rounded border-l-4 border-blue-500 bg-blue-100 p-4 text-blue-700">
              <strong className="mb-2 block">
                How to set up Gemini API Integration:
              </strong>
              <ol className="list-inside list-decimal space-y-1">
                <li>
                  Go to{" "}
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-700 underline"
                  >
                    Google AI Studio
                  </a>{" "}
                  and create an API key.
                </li>
                <li>Copy the API key and paste it below.</li>
                <li>Click on validate button to validate the API key.</li>
              </ol>
            </div>
          </div>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onValidate)}
              className="flex flex-col gap-2"
              autoComplete="off"
            >
              <div className="flex flex-row items-center gap-2">
                <FormField
                  control={form.control}
                  name="apiKey"
                  render={({ field }) => (
                    <FormItem className="w-full">
                      <FormLabel>Enter Gemini API Key</FormLabel>
                      <FormControl>
                        <Input
                          id="gemini-api-key"
                          type="text"
                          placeholder="API Key"
                          className="w-full"
                          {...field}
                          disabled={!editMode || checking}
                          ref={inputRef}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {(!gemini || editMode) && (
                  <Button
                    type="submit"
                    className="mt-auto shrink-0"
                    disabled={checking || !editMode}
                  >
                    {checking ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Validate"
                    )}
                  </Button>
                )}

                {gemini && !editMode && (
                  <div className="mt-auto flex flex-row items-center gap-2">
                    <div className="flex-1" />
                    <Button
                      type="button"
                      className="mt-auto shrink-0"
                      onClick={handleEdit}
                    >
                      Edit
                    </Button>
                  </div>
                )}
              </div>
            </form>
          </Form>
          {showChecks && editMode && (
            <div className="mt-6 flex flex-col items-center justify-center">
              <div className="flex w-full max-w-sm flex-col gap-4 rounded-lg border bg-transparent p-6">
                <h4 className="mb-2 text-center text-base font-semibold">
                  API Validation
                </h4>
                <ValidationCheck
                  label="API Key Validation"
                  result={results.validation}
                />
              </div>
            </div>
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};

function ValidationCheck({
  label,
  result,
}: {
  label: string;
  result: {
    ok: boolean | null;
    error?: string;
    modelsCount?: number;
    models?: string[];
  } | null;
}) {
  let icon = <Loader2 className="h-4 w-4 animate-spin text-gray-400" />;
  let errorMsg = "";
  let successContent = null;

  if (result && result.ok === true) {
    icon = <CheckCircle2 className="h-4 w-4 text-green-600" />;
    if (result.models && result.models.length > 0) {
      successContent = (
        <div className="mt-2 text-xs text-green-600">
          <div className="mb-1 font-medium">
            Available models ({result.modelsCount}):
          </div>
          <div className="flex flex-wrap gap-1">
            {result.models.map((model, index) => (
              <span
                key={index}
                className="rounded border border-green-200 bg-green-50 px-2 py-1 text-green-700"
              >
                {model}
              </span>
            ))}
          </div>
        </div>
      );
    }
  } else if (result && result.ok === false) {
    icon = <XCircle className="h-4 w-4 text-red-600" />;
    errorMsg = result.error || "";
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="flex-shrink-0">{icon}</span>
        <span className="font-medium">{label}</span>
        {errorMsg && (
          <span className="ml-2 text-xs text-red-500">{errorMsg}</span>
        )}
      </div>
      {successContent}
    </div>
  );
}
