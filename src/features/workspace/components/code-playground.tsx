"use client";

import {
    SandpackCodeEditor,
    SandpackLayout,
    SandpackPreview,
    SandpackProvider,
} from "@codesandbox/sandpack-react";

interface CodePlaygroundProps {
    code?: string;
}

const DEFAULT_CODE = `export default function LearningCard() {
  return (
    <article style={{ padding: 16, borderRadius: 12, border: '1px solid #d4d4d8', fontFamily: 'system-ui' }}>
      <h2 style={{ marginBottom: 8 }}>Physics Formula</h2>
      <p style={{ margin: 0 }}>Energy: E = m * c * c</p>
    </article>
  );
}`;

export function CodePlayground({ code = DEFAULT_CODE }: CodePlaygroundProps) {
    return (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
                <h3 className="text-base font-semibold text-slate-900">Interactive Code Lab</h3>
                <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-medium text-sky-700">
                    Sandpack
                </span>
            </div>

            <SandpackProvider
                template="react-ts"
                customSetup={{
                    dependencies: {
                        react: "latest",
                        "react-dom": "latest",
                    },
                }}
                files={{
                    "/App.tsx": code,
                }}
                options={{
                    autorun: true,
                    recompileMode: "delayed",
                    recompileDelay: 300,
                }}
            >
                <SandpackLayout className="overflow-hidden rounded-2xl border border-slate-200">
                    <SandpackCodeEditor
                        showTabs
                        showLineNumbers
                        style={{ height: 360 }}
                    />
                    <SandpackPreview style={{ height: 360 }} />
                </SandpackLayout>
            </SandpackProvider>
        </section>
    );
}
