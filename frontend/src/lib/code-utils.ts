/**
 * Parses an AI stream of line-based comments and applies them to the original code.
 * Expected AI format:
 * Line 5: // This is a comment
 * 10: // Another comment
 *
 * @param originalCode The original source code
 * @param aiStream The appended comment output from the AI
 * @returns The original code with comments injected at the correct lines
 */
export function parseAndApplyComments(originalCode: string, aiStream: string): string {
    const lines = originalCode.split('\n');
    const commentMap: Record<number, string[]> = {};

    // Match patterns like "Line 5: // comment" or "5: // comment"
    const regex = /(?:Line\s+)?(\d+):\s*(.*)/gi;
    let match;
    
    // We iterate through all lines of the AI output
    const aiLines = aiStream.split('\n');
    for (const aiLine of aiLines) {
        // Reset regex state for each line
        const resetRegex = new RegExp(regex);
        match = resetRegex.exec(aiLine);
        if (match) {
            const lineNum = parseInt(match[1], 10);
            const comment = match[2].trim();
            if (comment) {
                if (!commentMap[lineNum]) commentMap[lineNum] = [];
                commentMap[lineNum].push(comment);
            }
        }
    }

    const result: string[] = [];
    for (let i = 0; i < lines.length; i++) {
        const lineNum = i + 1;
        if (commentMap[lineNum]) {
            // Get indentation of the current line to match it
            const indentationMatch = lines[i].match(/^\s*/);
            const indentation = indentationMatch ? indentationMatch[0] : '';
            
            for (const comment of commentMap[lineNum]) {
                result.push(`${indentation}${comment}`);
            }
        }
        result.push(lines[i]);
    }

    return result.join('\n');
}
