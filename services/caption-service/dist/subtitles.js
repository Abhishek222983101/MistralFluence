/**
 * Group words into 3-5 word phrases.
 * Split on: 5 words max, >300ms gap, punctuation.
 */
export function groupWordsIntoPhrases(words) {
    if (words.length === 0)
        return [];
    const segments = [];
    let current = [];
    for (let i = 0; i < words.length; i++) {
        const word = words[i];
        current.push(word);
        const isLastWord = i === words.length - 1;
        const nextWord = words[i + 1];
        const gap = nextWord ? nextWord.start - word.end : 0;
        const endsWithPunctuation = /[.!?,;:]$/.test(word.word);
        const hitMaxWords = current.length >= 5;
        if (isLastWord || hitMaxWords || gap > 0.3 || endsWithPunctuation) {
            segments.push({
                text: current.map((w) => w.word).join(" "),
                start: current[0].start,
                end: current[current.length - 1].end,
                words: [...current],
            });
            current = [];
        }
    }
    return segments;
}
/**
 * Generate ASS subtitle content with \kf karaoke highlight tags.
 * Style: white text, black outline, yellow highlight sweep per word.
 */
export function generateASS(segments, videoWidth = 1080, videoHeight = 1920) {
    const header = `[Script Info]
Title: Caption
ScriptType: v4.00+
PlayResX: ${videoWidth}
PlayResY: ${videoHeight}
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,72,&H00FFFFFF,&H0000FFFF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,4,0,2,40,40,200,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text`;
    const events = segments.map((seg) => {
        const startTime = formatASSTime(seg.start);
        const endTime = formatASSTime(seg.end);
        // Build karaoke text: \kf<centiseconds> per word
        const karaokeText = seg.words
            .map((w) => {
            const durationCs = Math.round((w.end - w.start) * 100);
            return `{\\kf${durationCs}}${w.word}`;
        })
            .join(" ");
        return `Dialogue: 0,${startTime},${endTime},Default,,0,0,0,,${karaokeText}`;
    });
    return header + "\n" + events.join("\n") + "\n";
}
function formatASSTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const cs = Math.round((seconds % 1) * 100);
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
}
