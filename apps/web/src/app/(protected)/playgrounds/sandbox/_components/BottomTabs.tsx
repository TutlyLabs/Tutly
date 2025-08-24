import {
  SandpackConsole,
  SandpackTests,
  useSandpack,
} from "@codesandbox/sandpack-react";
import { useState } from "react";

export function BottomTabs() {
  const { sandpack, dispatch } = useSandpack();
  const [activeTab, setActiveTab] = useState<"console" | "tests">("console");
  const [showTestDetails, setShowTestDetails] = useState(false);
  const [testStatus, setTestStatus] = useState<
    "initialising" | "idle" | "running" | "complete"
  >("idle");

  const hasTestFiles = Object.keys(sandpack.files).some((path) =>
    /.*\.(test|spec)\.[tj]sx?$/.test(path),
  );

  if (!hasTestFiles && activeTab === "tests") {
    setActiveTab("console");
  }

  const runTests = () => {
    setTestStatus("running");
    setTimeout(() => {
      dispatch({ type: "run-all-tests" });
    }, 300);
  };

  return (
    <div className="flex h-[93%] flex-col">
      {/* Tab Headers */}
      <div
        className="flex h-[42px] flex-shrink-0 items-center justify-between border-b px-4 backdrop-blur-xl"
        style={{
          borderColor: "rgba(100, 100, 100, 0.2)",
          background:
            "linear-gradient(90deg, rgba(20, 20, 20, 0.9) 0%, rgba(40, 40, 40, 0.8) 100%)",
        }}
      >
        <div className="flex items-center">
          <button
            onClick={() => setActiveTab("console")}
            className={`flex items-center rounded px-3 py-1 text-sm font-semibold transition-colors ${
              activeTab === "console"
                ? "opacity-100"
                : "opacity-60 hover:opacity-80"
            }`}
            style={{ color: "#ffffff" }}
          >
            <span
              className="mr-2 h-2 w-2 animate-pulse rounded-full shadow-sm"
              style={{
                backgroundColor: "#06b6d4",
                boxShadow: "0 0 4px rgba(6, 182, 212, 0.5)",
              }}
              hidden={activeTab === "tests"}
            ></span>
            Console
          </button>
          {hasTestFiles && (
            <button
              onClick={() => setActiveTab("tests")}
              className={`flex items-center rounded px-3 py-1 text-sm font-semibold transition-colors ${
                activeTab === "tests"
                  ? "opacity-100"
                  : "opacity-60 hover:opacity-80"
              }`}
              style={{ color: "#ffffff" }}
            >
              <span
                className="mr-2 h-2 w-2 animate-pulse rounded-full shadow-sm"
                style={{
                  backgroundColor: "#10b981",
                  boxShadow: "0 0 4px rgba(16, 185, 129, 0.5)",
                }}
                hidden={activeTab === "console"}
              ></span>
              Tests
            </button>
          )}
        </div>

        <div className="flex items-center">
          {activeTab === "tests" && hasTestFiles && (
            <>
              <button
                onClick={runTests}
                disabled={testStatus === "running"}
                className="rounded px-3 py-1 text-xs font-medium transition-colors disabled:opacity-50"
                style={{
                  backgroundColor:
                    testStatus === "running"
                      ? "rgba(16, 185, 129, 0.3)"
                      : "rgba(16, 185, 129, 0.8)",
                  color: "#ffffff",
                }}
              >
                {testStatus === "running" ? "Running..." : "Run Tests"}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "console" && (
          <SandpackConsole
            style={{
              height: "100%",
              width: "100%",
              overflow: "auto",
            }}
          />
        )}
        {activeTab === "tests" && hasTestFiles && (
          <SandpackTests
            verbose
            showVerboseButton={false}
            // showWatchButton={false}
            // watchMode={false}
            watchMode
            onComplete={(_specs) => {
              setTestStatus("complete");
              //todo: use the specs to update the test results, call an attempt to backend
            }}
            style={{
              height: "100%",
              width: "100%",
              overflow: "auto",
            }}
            className={
              showTestDetails ? "show-test-details" : "hide-test-details"
            }
            actionsChildren={
              <button
                onClick={() => setShowTestDetails(!showTestDetails)}
                className="ml-2 rounded-full px-3 py-1 text-xs font-medium text-white transition-colors"
                style={{
                  backgroundColor: "var(--sp-colors-surface2)",
                  border: "1px solid var(--sp-colors-surface3)",
                }}
              >
                {showTestDetails ? "Hide Details" : "Show Details"}
              </button>
            }
          />
        )}
      </div>
    </div>
  );
}
