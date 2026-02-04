import React from 'react';

interface ProgressBarProps {
    progress: number;
    label?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ progress, label }) => {
    return (
        <div className="w-full max-w-md mx-auto mt-4">
            <div className="flex justify-between mb-1">
                <span className="text-sm font-medium text-blue-700 dark:text-white">{label || 'Processing...'}</span>
                <span className="text-sm font-medium text-blue-700 dark:text-white">{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2.5 dark:bg-slate-700">
                <div
                    className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${progress}%` }}
                ></div>
            </div>
        </div>
    );
};
