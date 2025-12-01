"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Info,
  Chrome,
  ShieldAlert,
  Terminal,
  Globe,
  ExternalLink,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

export function PlaygroundHelpDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full bg-white/5 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
        >
          <Info className="h-4 w-4" />
          <span className="sr-only">Troubleshooting Help</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl overflow-hidden border-white/10 bg-[#09090b] p-0 text-white shadow-2xl sm:max-h-[85vh]">
        <div className="flex h-full flex-col">
          {/* Header */}
          <DialogHeader className="border-b border-white/10 bg-white/5 px-6 py-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
                <Terminal className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-semibold tracking-tight">
                  Connection Troubleshooting
                </DialogTitle>
                <p className="mt-1 text-sm text-white/50">
                  Follow these steps to resolve local connection issues
                </p>
              </div>
            </div>
          </DialogHeader>

          <ScrollArea className="flex-1">
            <div className="p-6">
              <Tabs defaultValue="chrome" className="w-full">
                <TabsList className="mb-6 grid w-full grid-cols-2 rounded-xl border border-white/5 bg-white/5 p-1">
                  <TabsTrigger
                    value="chrome"
                    className="rounded-lg text-white/60 transition-all data-[state=active]:bg-blue-600 data-[state=active]:text-white"
                  >
                    <Chrome className="mr-2 h-4 w-4" />
                    Chrome / Edge
                  </TabsTrigger>
                  <TabsTrigger
                    value="safari"
                    className="rounded-lg text-white/60 transition-all data-[state=active]:bg-purple-600 data-[state=active]:text-white"
                  >
                    <Globe className="mr-2 h-4 w-4" />
                    Safari / Brave
                  </TabsTrigger>
                </TabsList>

                {/* Chrome Content */}
                <TabsContent
                  value="chrome"
                  className="space-y-6 focus-visible:outline-none"
                >
                  <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-5">
                    <div className="flex items-start gap-4">
                      <div className="mt-1 shrink-0 rounded-full bg-blue-500/10 p-2">
                        <ShieldAlert className="h-5 w-5 text-blue-400" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="font-medium text-blue-100">
                          Local Network Access
                        </h3>
                        <p className="text-sm leading-relaxed text-blue-200/60">
                          Recent Chrome/Chromium updates may block{" "}
                          <a
                            href="https://developer.chrome.com/blog/local-network-access"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 underline underline-offset-4 hover:text-blue-300"
                          >
                            local network access
                          </a>{" "}
                          by default. This prevents Tutly Playgrounds from
                          accessing your local development server.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-sm font-medium tracking-wider text-white/80 uppercase">
                      Resolution Steps
                    </h4>
                    <div className="grid gap-3">
                      <div className="flex items-center gap-4 rounded-lg border border-white/5 bg-white/[0.02] p-4 transition-colors hover:bg-white/[0.04]">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-medium text-white/60">
                          1
                        </div>
                        <span className="text-sm text-white/80">
                          Open <strong>"Site information"</strong> in the URL
                          bar (lock/tune icon)
                        </span>
                      </div>
                      <div className="flex items-center gap-4 rounded-lg border border-white/5 bg-white/[0.02] p-4 transition-colors hover:bg-white/[0.04]">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-medium text-white/60">
                          2
                        </div>
                        <span className="text-sm text-white/80">
                          Make sure <strong>"Local network access"</strong> is
                          enabled
                        </span>
                      </div>
                      <div className="flex items-center gap-4 rounded-lg border border-white/5 bg-white/[0.02] p-4 transition-colors hover:bg-white/[0.04]">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-medium text-white/60">
                          3
                        </div>
                        <span className="text-sm text-white/80">
                          Reload the page
                        </span>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* Safari/Brave Content */}
                <TabsContent
                  value="safari"
                  className="space-y-6 focus-visible:outline-none"
                >
                  <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-5">
                    <div className="flex items-start gap-4">
                      <div className="mt-1 shrink-0 rounded-full bg-purple-500/10 p-2">
                        <ShieldAlert className="h-5 w-5 text-purple-400" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="font-medium text-purple-100">
                          Using Safari or Brave?
                        </h3>
                        <p className="text-sm leading-relaxed text-purple-200/60">
                          Safari and Brave block access to localhost by default.
                          You need to install{" "}
                          <a
                            href="https://github.com/FiloSottile/mkcert"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 underline underline-offset-4 hover:text-blue-300"
                          >
                            mkcert
                          </a>{" "}
                          and generate a self-signed certificate.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-sm font-medium tracking-wider text-white/80 uppercase">
                      Resolution Steps
                    </h4>

                    <div className="grid gap-3">
                      <div className="flex items-center gap-4 rounded-lg border border-white/5 bg-white/[0.02] p-4 transition-colors hover:bg-white/[0.04]">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-medium text-white/60">
                          1
                        </div>
                        <div className="text-sm text-white/80">
                          Follow the mkcert{" "}
                          <a
                            href="https://github.com/FiloSottile/mkcert#installation"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 underline underline-offset-4 hover:text-blue-300"
                          >
                            installation steps
                          </a>{" "}
                          for your OS
                        </div>
                      </div>

                      <div className="flex items-center gap-4 rounded-lg border border-white/5 bg-white/[0.02] p-4 transition-colors hover:bg-white/[0.04]">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-medium text-white/60">
                          2
                        </div>
                        <div className="text-sm text-white/80">
                          Run{" "}
                          <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-xs text-white">
                            mkcert -install
                          </code>{" "}
                          in your terminal
                        </div>
                      </div>

                      <div className="flex items-center gap-4 rounded-lg border border-white/5 bg-white/[0.02] p-4 transition-colors hover:bg-white/[0.04]">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-medium text-white/60">
                          3
                        </div>
                        <div className="text-sm text-white/80">
                          Restart your playground
                        </div>
                      </div>
                    </div>

                    <div className="rounded-lg bg-white/5 p-4 text-xs text-white/60">
                      <strong>Note:</strong> On Brave you can just disable Brave
                      Shields for this site.
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </ScrollArea>

          {/* Footer */}
          <div className="border-t border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between text-xs text-white/40">
              <div>Need more help?</div>
              <div className="flex gap-4">
                <a
                  href="https://docs.tutly.in/cli/installation"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 hover:text-white"
                >
                  Documentation
                </a>
                <span className="flex items-center gap-1">Chat with us</span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
