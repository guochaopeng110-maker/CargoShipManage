import React from 'react';
import { Construction, Ship } from 'lucide-react';

interface UnderDevelopmentPageProps {
  moduleName: string;
}

export function UnderDevelopmentPage({ moduleName }: UnderDevelopmentPageProps) {
  return (
    <div className="min-h-full bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 flex items-center justify-center p-8">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-24 h-24 bg-cyan-500/20 rounded-full mb-6 border-2 border-cyan-500">
          <Construction className="w-12 h-12 text-cyan-400" />
        </div>
        
        <h1 className="text-slate-100 mb-4">
          功能开发中
        </h1>
        
        <p className="text-slate-300 mb-8 max-w-md mx-auto">
          此模块正在建设中，请稍后再来！
        </p>

        <div className="flex items-center justify-center gap-3 text-slate-400">
          <Ship className="w-5 h-5" />
          <span className="text-sm">
            当前模块: <span className="text-cyan-400">{moduleName}</span>
          </span>
        </div>
      </div>
    </div>
  );
}
