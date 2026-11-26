const MARK = /\*\*([^*]+)\*\*|_([^_]+)_/g;

export const parseMarkup = (text) => {
	const source = String(text || "");
	const runs = [];
	let last = 0;
	MARK.lastIndex = 0;
	let match = MARK.exec(source);
	while (match) {
		if (match.index > last) runs.push({ text: source.slice(last, match.index), bold: false, italic: false });
		if (match[1] != null) runs.push({ text: match[1], bold: true, italic: false });
		else runs.push({ text: match[2], bold: false, italic: true });
		last = match.index + match[0].length;
		match = MARK.exec(source);
	}
	if (last < source.length) runs.push({ text: source.slice(last), bold: false, italic: false });
	return runs.filter((run) => run.text);
};

export const plainText = (text) =>
	String(text || "")
		.replace(/\*\*([^*]+)\*\*/g, "$1")
		.replace(/_([^_]+)_/g, "$1");

export const bulletLines = (text) =>
	String(text || "")
		.split(/\n+/)
		.map((line) => line.replace(/^(?:[-•]\s+|\*(?!\*)\s+)/, "").trim())
		.filter(Boolean)
		.map((line) => {
			if (line.includes("**")) return line;
			const colon = line.indexOf(":");
			if (colon > 2 && colon < 80) return `**${line.slice(0, colon + 1)}**${line.slice(colon + 1)}`;
			return line;
		});

export const formatAdvisory = (text) => {
	const value = String(text || "").trim();
	if (!value) return "**STRATEGIC ADVISORY:** —";
	if (value.includes("**")) return value;
	const colon = value.indexOf(":");
	if (colon > 8 && colon < 100) return `**${value.slice(0, colon + 1)}**${value.slice(colon + 1)}`;
	return `**STRATEGIC ADVISORY:** ${value}`;
};
