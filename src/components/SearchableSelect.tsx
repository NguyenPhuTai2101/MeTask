"use client";
import React, { useState, useRef, useEffect } from "react";

export interface SearchOption {
  value: string;
  label: string;
  subLabel?: string;
  avatarUrl?: string;
}

interface SearchableSelectProps {
  options: SearchOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Chọn...",
  className = "",
  disabled = false,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    opt.subLabel?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className={`relative ${className}`} ref={wrapperRef}>
      <div
        className={`flex items-center justify-between h-9 w-full rounded-lg bg-white border border-[#cfdaf2] px-3 text-xs ${
          disabled ? "opacity-60 cursor-not-allowed bg-slate-50" : "cursor-pointer hover:border-primary"
        }`}
        onClick={() => {
          if (!disabled) setIsOpen(!isOpen);
        }}
      >
        <div className="flex items-center gap-2 overflow-hidden flex-1">
          {selectedOption?.avatarUrl && (
             <img src={selectedOption.avatarUrl} alt="" className="w-5 h-5 rounded-full object-cover" />
          )}
          <span className={`truncate ${selectedOption ? "text-slate-700 font-medium" : "text-slate-400"}`}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>
        <span className="material-symbols-outlined text-[16px] text-slate-400">
          expand_more
        </span>
      </div>

      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl flex flex-col overflow-hidden">
          <div className="p-2 border-b border-slate-100 bg-slate-50/50">
            <input
              type="text"
              className="w-full h-8 px-2 text-xs bg-white border border-slate-200 rounded outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
              placeholder="Gõ để tìm kiếm..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              autoFocus
            />
          </div>
          <div className="overflow-y-auto max-h-48 py-1">
            <div
                className="flex items-center gap-2 px-3 py-2 text-xs cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => {
                  onChange("");
                  setIsOpen(false);
                  setSearchTerm("");
                }}
              >
                <span className="text-slate-500 italic">Bỏ chọn / Trống</span>
            </div>
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => (
                <div
                  key={opt.value}
                  className={`flex items-center gap-2 px-3 py-2 text-xs cursor-pointer hover:bg-slate-50 transition-colors ${
                    value === opt.value ? "bg-blue-50/50" : ""
                  }`}
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                    setSearchTerm("");
                  }}
                >
                  {opt.avatarUrl && (
                    <img src={opt.avatarUrl} alt="" className="w-6 h-6 rounded-full object-cover shadow-sm" />
                  )}
                  <div className="flex-1 overflow-hidden">
                    <p className={`truncate ${value === opt.value ? "font-bold text-primary" : "font-medium text-slate-700"}`}>
                      {opt.label}
                    </p>
                    {opt.subLabel && <p className="text-[10px] text-slate-400 truncate">{opt.subLabel}</p>}
                  </div>
                  {value === opt.value && (
                    <span className="material-symbols-outlined text-[14px] text-primary">check</span>
                  )}
                </div>
              ))
            ) : (
              <div className="p-3 text-xs text-center text-slate-400">Không tìm thấy kết quả</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
