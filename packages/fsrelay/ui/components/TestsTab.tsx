import React, { useState, useEffect, useCallback } from "react";

interface TestError {
  message?: string;
  stack?: string;
  actual?: any;
  expected?: any;
  showDiff?: boolean;
}

interface MochaTestResult {
  title: string;
  fullTitle: string;
  file?: string;
  duration?: number;
  currentRetry?: number;
  speed?: string;
  err: TestError | Record<string, never>;
}

interface TestStats {
  suites: number;
  tests: number;
  passes: number;
  failures: number;
  pending: number;
  duration: number;
  start?: string;
  end?: string;
}

interface MochaTestRunResult {
  stats: TestStats;
  tests: MochaTestResult[];
  failures: MochaTestResult[];
  passes: MochaTestResult[];
  pending: MochaTestResult[];
}

interface TestResult {
  id: string;
  title: string;
  fullTitle: string;
  status: "passed" | "failed" | "pending";
  duration: number;
  error?: {
    message: string;
    stack?: string;
    actual?: any;
    expected?: any;
    diff?: string;
  };
}

interface TestRunResult {
  stats: TestStats;
  tests: TestResult[];
  failures: TestResult[];
  passes: TestResult[];
}

type TestState = "idle" | "discovering" | "running" | "results" | "error";

declare global {
  interface Window {
    vscode: {
      postMessage: (message: any) => void;
    };
  }
}

export function TestsTab() {
  const [state, setState] = useState<TestState>("idle");
  const [discoveredTests, setDiscoveredTests] = useState<TestResult[]>([]);
  const [testResults, setTestResults] = useState<TestRunResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progressMessage, setProgressMessage] = useState<string>("");
  const [expandedTests, setExpandedTests] = useState<Set<string>>(new Set());

  const normalizeMochaResults = (data: MochaTestRunResult): TestRunResult => {
    const normalizeTest = (test: MochaTestResult, index: number): TestResult => {
      const hasError = test.err && Object.keys(test.err).length > 0;
      const isPending = data.pending?.some(p => p.fullTitle === test.fullTitle);
      const isFailed = data.failures?.some(f => f.fullTitle === test.fullTitle);

      return {
        id: `${index}-${test.fullTitle}`,
        title: test.title,
        fullTitle: test.fullTitle,
        status: isPending ? "pending" : isFailed ? "failed" : "passed",
        duration: test.duration || 0,
        error: hasError ? {
          message: (test.err as TestError).message || "Test failed",
          stack: (test.err as TestError).stack,
          actual: (test.err as TestError).actual,
          expected: (test.err as TestError).expected,
        } : undefined
      };
    };

    return {
      stats: data.stats,
      tests: data.tests?.map(normalizeTest) || [],
      failures: data.failures?.map((t, i) => normalizeTest(t, i)) || [],
      passes: data.passes?.map((t, i) => normalizeTest(t, i)) || []
    };
  };

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;

      switch (message.type) {
        case "testDiscovery":
          if (message.data?.tests && Array.isArray(message.data.tests)) {
            const tests: TestResult[] = message.data.tests.map((test: any, index: number) => ({
              id: `discover-${index}-${test.fullTitle || test.title}`,
              title: test.title,
              fullTitle: test.fullTitle || test.title,
              status: "pending" as const,
              duration: 0,
            }));
            setDiscoveredTests(tests);
          }
          setState("idle");
          break;
        case "testProgress":
          setProgressMessage(message.message);
          break;
        case "testResults":
          const normalizedResults = normalizeMochaResults(message.data);
          setTestResults(normalizedResults);
          setState("results");
          if (normalizedResults.failures.length > 0) {
            const failedIds = new Set<string>(
              normalizedResults.failures.map((t: TestResult) => t.id || t.fullTitle)
            );
            setExpandedTests(failedIds);
          }
          break;
        case "testError":
          setError(message.error);
          setState("error");
          break;
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  useEffect(() => {
    handleDiscoverTests();
  }, []);

  const handleDiscoverTests = useCallback(() => {
    setState("discovering");
    window.vscode?.postMessage({ type: "discoverTests" });
  }, []);

  const handleRunTests = useCallback(() => {
    setState("running");
    setError(null);
    setProgressMessage("Starting test runner...");
    window.vscode?.postMessage({ type: "runTests" });
  }, []);

  const toggleTest = (id: string) => {
    const newExpanded = new Set(expandedTests);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedTests(newExpanded);
  };

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  if (state === "idle" || state === "discovering") {
    return (
      <div className="h-full flex flex-col bg-[#1e1e1e]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#3e3e3e] bg-[#252526]">
          <div className="text-sm font-medium text-[#cccccc]">Test Runner</div>
          <button
            onClick={handleRunTests}
            disabled={state === "discovering"}
            className="flex items-center gap-2 px-3 py-1.5 bg-[#0e639c] hover:bg-[#1177bb] text-white text-xs font-medium rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Run Tests
          </button>
        </div>

        {/* Test list */}
        <div className="flex-1 overflow-auto">
          {state === "discovering" ? (
            <div className="flex flex-col items-center justify-center h-full text-[#858585]">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-3"></div>
              <p className="text-sm">Discovering tests...</p>
            </div>
          ) : discoveredTests.length > 0 ? (
            <>
              {/* Stats header */}
              <div className="px-4 py-2 border-b border-[#3e3e3e] bg-[#252526]">
                <div className="text-xs text-[#858585]">
                  {discoveredTests.length} test{discoveredTests.length !== 1 ? "s" : ""} available
                </div>
              </div>
              {discoveredTests.map((test) => (
                <div key={test.id} className="border-b border-[#2d2d2d] last:border-b-0">
                  <div className="px-4 py-3 hover:bg-[#2a2a2a] flex items-start gap-3 transition-colors">
                    <span className="flex-shrink-0 mt-0.5 text-[#858585]">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="9" strokeWidth={2} />
                      </svg>
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-[#cccccc] leading-relaxed">{test.fullTitle || test.title}</div>
                      <div className="text-xs text-[#858585] mt-1">{formatDuration(test.duration)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-[#858585] p-8">
              <svg className="w-16 h-16 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-sm mb-1">No tests found</p>
              <p className="text-xs text-center">
                Create test files with <code className="px-1 py-0.5 bg-[#2d2d2d] rounded">.spec.js</code> or{" "}
                <code className="px-1 py-0.5 bg-[#2d2d2d] rounded">.test.js</code> extension
              </p>
              <button
                onClick={handleRunTests}
                className="mt-4 flex items-center gap-2 px-4 py-2 bg-[#0e639c] hover:bg-[#1177bb] text-white text-sm font-medium rounded transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                </svg>
                Run Tests Anyway
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (state === "running") {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-[#1e1e1e] text-[#cccccc]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
        <p className="text-sm font-medium mb-2">Running Tests</p>
        <p className="text-xs text-[#858585] animate-pulse">{progressMessage || "Please wait..."}</p>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="h-full flex flex-col bg-[#1e1e1e]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#3e3e3e] bg-[#252526]">
          <div className="text-sm font-medium text-red-400">Test Error</div>
          <button
            onClick={handleRunTests}
            className="flex items-center gap-2 px-3 py-1.5 bg-[#0e639c] hover:bg-[#1177bb] text-white text-xs font-medium rounded transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Retry
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <svg className="w-16 h-16 mx-auto mb-4 text-red-400 opacity-75" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-sm text-[#cccccc] mb-2">Failed to run tests</p>
            <p className="text-xs text-[#858585] font-mono bg-[#2d2d2d] p-3 rounded">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (state === "results" && testResults) {
    const { stats, tests } = testResults;
    const passRate = stats.tests > 0 ? Math.round((stats.passes / stats.tests) * 100) : 0;

    return (
      <div className="h-full flex flex-col bg-[#1e1e1e]">
        {/* Header with stats */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#3e3e3e] bg-[#252526]">
          <div className="flex items-center gap-4">
            <div className="text-xs text-[#cccccc]">
              {stats.tests} test{stats.tests !== 1 ? "s" : ""} in {formatDuration(stats.duration)}
            </div>
            <div className="flex gap-4">
              {stats.passes > 0 && (
                <span className="text-xs font-medium text-green-400 flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  {stats.passes} passed
                </span>
              )}
              {stats.failures > 0 && (
                <span className="text-xs font-medium text-red-400 flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  {stats.failures} failed
                </span>
              )}
              {stats.pending > 0 && (
                <span className="text-xs font-medium text-yellow-400 flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                  {stats.pending} pending
                </span>
              )}
            </div>
          </div>
          <button
            onClick={handleRunTests}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-[#0e639c] hover:bg-[#1177bb] text-white text-xs font-medium rounded transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Re-run
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-[#2d2d2d] flex">
          <div
            className="bg-green-500 transition-all"
            style={{ width: `${passRate}%` }}
          />
          <div
            className="bg-red-500 transition-all"
            style={{ width: `${100 - passRate}%` }}
          />
        </div>

        {/* Test Results */}
        <div className="flex-1 overflow-auto">
          {tests.map((test, index) => {
            const testId = test.id || test.fullTitle || index.toString();
            const isExpanded = expandedTests.has(testId);

            return (
              <div key={testId} className="border-b border-[#2d2d2d] last:border-b-0">
                <div
                  className="group px-4 py-3 hover:bg-[#2a2a2a] cursor-pointer flex items-start gap-3 transition-colors"
                  onClick={() => test.error && toggleTest(testId)}
                >
                  <span className={`flex-shrink-0 mt-0.5 ${test.status === "passed" ? "text-green-400" :
                    test.status === "pending" ? "text-yellow-400" : "text-red-400"
                    }`}>
                    {test.status === "passed" ? (
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    ) : test.status === "pending" ? (
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    )}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-[#cccccc] leading-relaxed">{test.fullTitle || test.title}</div>
                    <div className="text-xs text-[#858585] mt-1">{formatDuration(test.duration)}</div>
                  </div>
                  {test.error && (
                    <svg
                      className={`w-4 h-4 text-[#858585] transition-transform flex-shrink-0 mt-0.5 ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  )}
                </div>

                {/* Error Details */}
                {test.error && isExpanded && (
                  <div className="px-4 pb-4 bg-[#1a1a1a]">
                    <div className="ml-7 pl-4 border-l-2 border-red-400/30">
                      <div className="font-mono text-xs space-y-3">
                        {/* Error Message */}
                        <div className="text-cyan-400 leading-relaxed">
                          {test.error.message}
                        </div>

                        {/* Stack Trace */}
                        {test.error.stack && (
                          <div className="text-[#858585] leading-relaxed space-y-0.5">
                            {test.error.stack.split('\n').slice(0, 10).map((line, i) => (
                              <div key={i} className="hover:bg-[#2a2a2a] px-2 py-0.5 -mx-2 rounded">
                                {line.includes('file:///') || line.includes('at ') ? (
                                  <span className="text-blue-400">{line}</span>
                                ) : (
                                  line
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Diff if available */}
                        {(test.error.expected !== undefined || test.error.actual !== undefined) && (
                          <div className="space-y-2 mt-3">
                            <div className="text-[#858585] font-semibold">Expected vs Actual:</div>
                            <div className="space-y-1">
                              <div className="px-2 py-1 bg-green-900/20 text-green-400 rounded">
                                + Expected: {JSON.stringify(test.error.expected)}
                              </div>
                              <div className="px-2 py-1 bg-red-900/20 text-red-400 rounded">
                                - Actual: {JSON.stringify(test.error.actual)}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Raw diff if available */}
                        {test.error.diff && (
                          <div className="space-y-1 mt-3">
                            <div className="text-[#858585]">Diff:</div>
                            <div className="leading-relaxed bg-[#252526] p-2 rounded">
                              {test.error.diff.split('\n').map((line: string, i: number) => (
                                <div
                                  key={i}
                                  className={`px-2 py-0.5 ${line.startsWith('+') ? 'bg-green-900/20 text-green-400' :
                                    line.startsWith('-') ? 'bg-red-900/20 text-red-400' :
                                      'text-[#858585]'
                                    }`}
                                >
                                  {line}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {tests.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-[#858585]">
              <svg className="w-16 h-16 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-sm">No test results</p>
              <p className="text-xs mt-1">Run your tests to see results here</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col items-center justify-center bg-[#1e1e1e] text-[#858585]">
      <svg className="w-16 h-16 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      <p className="text-sm">Test Runner</p>
      <button
        onClick={handleRunTests}
        className="mt-4 flex items-center gap-2 px-4 py-2 bg-[#0e639c] hover:bg-[#1177bb] text-white text-sm font-medium rounded transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
        </svg>
        Run Tests
      </button>
    </div>
  );
}
