

import React from 'react';


const StructuredAnalysis = ({ analysis }) => {
    try {
        const data = JSON.parse(analysis);

        if (data.error) {
            return <p className="text-red-500">{data.error}</p>;
        }

        
        const renderList = (itemsString) => {
            if (!itemsString || itemsString === "None noted") {
                return <p className="text-muted-foreground italic">None noted</p>;
            }
            return (
                <ul className="list-disc pl-5 space-y-1">
                    {itemsString.split(';').map((item, index) => item.trim() && <li key={index}>{item.trim()}</li>)}
                </ul>
            );
        };
        
        return (
            <div className="space-y-4 text-sm">
                <div>
                    <h5 className="font-semibold text-xl mb-1">Summary</h5>
                    <p className="text-muted-foreground">{data.summary}</p>
                </div>
                <div>
                    <h5 className="font-semibold  text-xl mb-1">Key Metrics & Findings</h5>
                    {renderList(data.keyMetrics)}
                </div>
                <div>
                    <h5 className="font-semibold text-xl mb-1">Potential Abnormalities</h5>
                     {renderList(data.abnormalities)}
                </div>
                <div>
                    <h5 className="font-semibold text-xl mb-1">Suggestions</h5>
                    {renderList(data.suggestions)}
                </div>
            </div>
        );
    } catch (error) {
        
        return <p className="text-muted-foreground whitespace-pre-wrap">{analysis}</p>;
    }
};

export default StructuredAnalysis;