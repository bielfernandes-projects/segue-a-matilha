import React from 'react';
import { X, QrCode, Copy, Check } from 'lucide-react';

interface QRCodeModalProps {
  roomCode: string;
  onClose: () => void;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({ roomCode, onClose }) => {
  const [copied, setCopied] = React.useState(false);
  const roomUrl = `${window.location.origin}?code=${roomCode}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(roomUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(roomUrl)}&color=0b132b&bgcolor=ffffff`;

  return (
    <div className="fixed inset-0 z-50 bg-[#05070A]/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="relative w-full max-w-sm bg-[#0A0E14] border-2 border-[#2D3139] rounded-2xl p-6 shadow-2xl space-y-5 text-center">
        <div className="flex items-center justify-between pb-3 border-b border-[#2D3139]">
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-[#DDA15E]" />
            <h2 className="text-lg font-black uppercase tracking-tight italic text-[#FEFAE0]">
              QR Code da Sala
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#A3A3A3] hover:text-[#FEFAE0] hover:bg-[#11161D] rounded-xl transition-colors cursor-pointer border border-transparent hover:border-[#2D3139]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3">
          <p className="text-xs text-[#A3A3A3] font-medium">
            Aponte a câmera do celular dos amigos para entrar direto na sala!
          </p>

          <div className="w-56 h-56 mx-auto bg-[#FEFAE0] p-3 rounded-xl shadow-xl flex items-center justify-center border-4 border-[#DDA15E]">
            <img
              src={qrImageUrl}
              alt={`QR Code para a sala ${roomCode}`}
              className="w-full h-full object-contain rounded-lg"
              loading="lazy"
            />
          </div>

          <div className="bg-[#11161D] p-3 rounded-xl border border-[#2D3139] space-y-1">
            <span className="text-[10px] text-[#A3A3A3] uppercase font-bold tracking-widest block">Código de Acesso</span>
            <span className="font-mono text-2xl font-black text-[#DDA15E] tracking-wider block">{roomCode}</span>
          </div>
        </div>

        <button
          onClick={handleCopy}
          className="w-full py-3.5 rounded-xl bg-transparent border border-[#FEFAE0] text-[#FEFAE0] font-bold text-xs uppercase tracking-widest hover:bg-[#FEFAE0] hover:text-[#05070A] transition-colors flex items-center justify-center gap-2 cursor-pointer"
        >
          {copied ? <Check className="w-4 h-4 text-[#606C38]" /> : <Copy className="w-4 h-4 text-[#DDA15E]" />}
          <span>{copied ? 'Link Copiado!' : 'Copiar Link Completo'}</span>
        </button>
      </div>
    </div>
  );
};
