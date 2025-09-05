"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { Account } from "@prisma/client";
import { CheckCircle2, Loader2, SkipForward, XCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";
import Link from "next/link";

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

export const SandboxIntegration = ({
  sandbox,
}: {
  sandbox?: Account | undefined;
}) => {
  const formSchema = z.object({
    apiKey: z.string().min(1, "API key is required"),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { apiKey: sandbox?.accessToken || "" },
  });

  const [checking, setChecking] = useState(false);
  const [showChecks, setShowChecks] = useState(false);
  const [results, setResults] = useState<{
    create: { ok: boolean | null | "skipped"; error?: string } | null;
    read: { ok: boolean | null | "skipped"; error?: string } | null;
    edit: { ok: boolean | null | "skipped"; error?: string } | null;
    vmManage: { ok: boolean | null | "skipped"; error?: string } | null;
  }>({
    create: null,
    read: null,
    edit: null,
    vmManage: null,
  });
  const [editMode, setEditMode] = useState(!sandbox);
  const inputRef = useRef<HTMLInputElement>(null);

  // tRPC mutations
  const createSandboxMutation = api.sandbox.createSandbox.useMutation();
  const checkReadPermissionMutation =
    api.sandbox.checkReadPermission.useMutation();
  const checkEditPermissionMutation =
    api.sandbox.checkEditPermission.useMutation();
  const checkVMManagePermissionMutation =
    api.sandbox.checkVMManagePermission.useMutation();
  const saveAccountMutation = api.sandbox.saveCodesandboxAccount.useMutation();
  const cleanupTestSandboxMutation =
    api.sandbox.cleanupTestSandbox.useMutation();

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
    setResults({ create: null, read: null, edit: null, vmManage: null });

    try {
      // Step 1: Create sandbox
      setResults((prev) => ({ ...prev, create: { ok: null } }));
      const createResult = await createSandboxMutation.mutateAsync({
        apiKey: values.apiKey,
      });
      if (createResult.ok && createResult.sandboxId) {
        setResults((prev) => ({ ...prev, create: { ok: true } }));
        const sandboxId = createResult.sandboxId;

        // Step 2: Check read permission
        setResults((prev) => ({ ...prev, read: { ok: null } }));
        const readResult = await checkReadPermissionMutation.mutateAsync({
          apiKey: values.apiKey,
        });
        if (readResult.ok) {
          setResults((prev) => ({ ...prev, read: { ok: true } }));

          // Step 3: Check edit permission
          setResults((prev) => ({ ...prev, edit: { ok: null } }));
          const editResult = await checkEditPermissionMutation.mutateAsync({
            apiKey: values.apiKey,
            sandboxId,
          });
          if (editResult.ok) {
            setResults((prev) => ({ ...prev, edit: { ok: true } }));

            // Step 4: Check VM manage permission
            setResults((prev) => ({ ...prev, vmManage: { ok: null } }));
            const vmResult = await checkVMManagePermissionMutation.mutateAsync({
              apiKey: values.apiKey,
              sandboxId,
            });
            if (vmResult.ok) {
              setResults((prev) => ({ ...prev, vmManage: { ok: true } }));

              // All checks passed - save the account
              try {
                const saveResult = await saveAccountMutation.mutateAsync({
                  apiKey: values.apiKey,
                });
                if (saveResult.ok) {
                  toast.success(
                    "API key is valid, has all required permissions, and is now saved!",
                  );
                  setEditMode(false);
                } else {
                  toast.error(
                    "API key validated but failed to save in database.",
                  );
                }
              } catch (e) {
                toast.error("API key validated but error saving in database.");
              }

              // Cleanup the test sandbox
              try {
                await cleanupTestSandboxMutation.mutateAsync({
                  apiKey: values.apiKey,
                  sandboxId,
                });
              } catch (e) {
                // Ignore cleanup errors
              }

              setChecking(false);
              return;
            } else {
              setResults((prev) => ({
                ...prev,
                vmManage: {
                  ok: false,
                  error: vmResult.error || "VM Manage failed",
                },
              }));
              toast.error(
                vmResult.error || "VM Manage permission check failed.",
              );
            }
          } else {
            setResults((prev) => ({
              ...prev,
              edit: {
                ok: false,
                error: editResult.error || "Edit failed",
              },
              vmManage: { ok: "skipped" },
            }));
            toast.error(editResult.error || "Edit permission check failed.");
          }
        } else {
          setResults((prev) => ({
            ...prev,
            read: {
              ok: false,
              error: readResult.error || "Read failed",
            },
            edit: { ok: "skipped" },
            vmManage: { ok: "skipped" },
          }));
          toast.error(readResult.error || "Read permission check failed.");
        }

        // Cleanup the test sandbox
        try {
          await cleanupTestSandboxMutation.mutateAsync({
            apiKey: values.apiKey,
            sandboxId,
          });
        } catch (e) {
          // Ignore cleanup errors
        }
      } else {
        setResults((prev) => ({
          ...prev,
          create: {
            ok: false,
            error: createResult.error || "Creation failed",
          },
          read: { ok: "skipped" },
          edit: { ok: "skipped" },
          vmManage: { ok: "skipped" },
        }));
        toast.error(createResult.error || "Sandbox creation failed.");
      }
    } catch (err: any) {
      toast.error(
        err?.message || "An unexpected error occurred during validation.",
      );
    } finally {
      setChecking(false);
    }
  }

  return (
    <Accordion type="single" collapsible className="mt-8 w-full">
      <AccordionItem value="codesandbox">
        <AccordionTrigger className="flex flex-row items-center gap-4 p-4">
          <div className="flex flex-row items-center gap-4">
            <Image
              src="/integrations/codesandbox.png"
              alt="Codesandbox"
              width={28}
              height={28}
              className="h-7 w-7"
            />
            <span className="text-lg font-semibold">Codesandbox</span>
          </div>
        </AccordionTrigger>
        <AccordionContent className="p-4 pt-0">
          <div className="flex flex-col gap-2">
            <div className="mb-4 rounded border-l-4 border-orange-500 bg-orange-100 p-4 text-orange-700">
              <strong className="mb-2 block">
                How to set up CodeSandbox Integration:
              </strong>
              <ol className="list-inside list-decimal space-y-1">
                <li>
                  Create or log into your{" "}
                  <Link
                    href="https://codesandbox.io/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-orange-700 underline"
                  >
                    CodeSandbox account
                  </Link>
                  .
                </li>
                <li>
                  Create an API key at{" "}
                  <Link
                    href="https://codesandbox.io/t/api"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-orange-700 underline"
                  >
                    codesandbox.io/t/api
                  </Link>{" "}
                  (enable all scopes).
                </li>
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
                      <FormLabel>Enter Codesandbox API Key</FormLabel>
                      <FormControl>
                        <Input
                          id="codesandbox-api-key"
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
                {(!sandbox || editMode) && (
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

                {sandbox && !editMode && (
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
                  Preflight Checks
                </h4>
                <PermissionCheck
                  label="Sandbox Creation"
                  result={results.create}
                />
                <PermissionCheck label="Sandbox Read" result={results.read} />
                <PermissionCheck label="Sandbox Edit" result={results.edit} />
                <PermissionCheck label="VM Manage" result={results.vmManage} />
              </div>
            </div>
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};

function PermissionCheck({
  label,
  result,
}: {
  label: string;
  result: { ok: boolean | null | "skipped"; error?: string } | null;
}) {
  let icon = <Loader2 className="h-4 w-4 animate-spin text-gray-400" />;
  let errorMsg = "";

  if (result && result.ok === true) {
    icon = <CheckCircle2 className="h-4 w-4 text-green-600" />;
  } else if (result && result.ok === false) {
    icon = <XCircle className="h-4 w-4 text-red-600" />;
    errorMsg = result.error || "";
  } else if (result && result.ok === "skipped") {
    icon = <SkipForward className="h-4 w-4 text-gray-400" />;
  }

  return (
    <div className="flex items-center gap-2">
      <span className="flex-shrink-0">{icon}</span>
      <span className="font-medium">{label}</span>
      {errorMsg && (
        <span className="ml-2 text-xs text-red-500">{errorMsg}</span>
      )}
      {result?.ok === "skipped" && (
        <span className="ml-2 text-xs text-gray-500">Skipped</span>
      )}
    </div>
  );
}
