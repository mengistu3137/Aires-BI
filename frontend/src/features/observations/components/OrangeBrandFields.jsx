export const isOrangeProduct = (product) => /\borange\b/i.test(product?.name || "");

const keepMoney = (value, onChange) => {
	const next = String(value).replace(",", ".");
	if (/^\d*\.?\d{0,2}$/.test(next)) onChange(next);
};

const BrandInput = ({ label, value, onChange, disabled, inputRef }) => (
	<div>
		<label className="mb-1 block text-[11px] font-bold text-slate-700">{label}</label>
		<div className="relative">
			<input
				ref={inputRef}
				type="text"
				inputMode="decimal"
				autoComplete="off"
				disabled={disabled}
				value={value}
				placeholder="Not on shelf"
				onChange={(event) => keepMoney(event.target.value, onChange)}
				className="w-full rounded-lg border border-amber-300 bg-white px-3 py-2.5 pr-12 text-base font-black font-mono text-slate-900 outline-hidden focus:border-[#A41821]"
			/>
			<span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-extrabold text-slate-400">
				ETB
			</span>
		</div>
	</div>
);

export const optionalBrandPrice = (value) => {
	if (!String(value || "").trim()) return null;
	const amount = Number(value);
	return Number.isFinite(amount) && amount > 0 ? amount : null;
};

export const shelfPriceFromBrands = (ererValue, valenciaValue) => {
	const prices = [optionalBrandPrice(ererValue), optionalBrandPrice(valenciaValue)].filter(
		(amount) => amount !== null,
	);
	if (!prices.length) return null;
	return Math.min(...prices);
};

const brandAmount = (value) => {
	const amount = Number(value);
	if (!Number.isFinite(amount) || amount <= 0) return null;
	return Number.isInteger(amount) ? String(amount) : String(Math.round(amount * 100) / 100);
};

export const formatOrangePriceLabel = (observation) => {
	const erer = brandAmount(observation?.ererPrice);
	const valencia = brandAmount(observation?.valenciaPrice);
	if (erer && valencia) return `${erer}Erer/ ${valencia}Valencia`;
	if (erer) return `${erer}Erer`;
	if (valencia) return `${valencia}Valencia`;
	return null;
};

export const OrangeBrandFields = ({
	ererPrice,
	valenciaPrice,
	onErer,
	onValencia,
	disabled = false,
	ererRef,
}) => (
	<div className="mt-3 space-y-2 rounded-xl border border-amber-200 bg-amber-50/80 p-3">
		<p className="text-[11px] font-black uppercase tracking-wider text-amber-900">Orange brands</p>
		<p className="text-[10px] leading-relaxed text-amber-800">
			Optional. Enter Erer, Valencia, or both. Leave a brand blank when it is not on the shelf.
		</p>
		<div className="grid gap-2 sm:grid-cols-2">
			<BrandInput label="Erer" value={ererPrice} onChange={onErer} disabled={disabled} inputRef={ererRef} />
			<BrandInput label="Valencia" value={valenciaPrice} onChange={onValencia} disabled={disabled} />
		</div>
	</div>
);
