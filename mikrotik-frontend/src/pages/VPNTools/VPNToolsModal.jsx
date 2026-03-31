import React, { Fragment } from 'react';
import { X, ShieldCheck } from 'lucide-react';
import { Dialog, Transition } from '@headlessui/react';
import { useTranslation } from 'react-i18next';
import VPNTools from './VPNTools';

const VPNToolsModal = ({ isOpen, onClose }) => {
  const { t } = useTranslation();

  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-[100]" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-hidden">
          <div className="flex h-screen w-screen items-center justify-center text-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden bg-slate-50 text-left shadow-xl transition-all w-full h-full flex flex-col min-h-0">
                {/* Modal Header */}
                <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200 shadow-sm shrink-0">
                  <div className="flex items-center gap-4">
                    <div className="size-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-600/20">
                      <ShieldCheck size={24} />
                    </div>
                    <div>
                      <Dialog.Title as="h2" className="text-lg font-[1000] text-slate-900 uppercase tracking-tight">
                        {t('vpn.title')}
                      </Dialog.Title>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                        {t('vpn.subtitle')}
                      </p>
                    </div>
                  </div>
                  
                  <button 
                    onClick={onClose}
                    className="size-10 rounded-xl bg-slate-100 text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-all flex items-center justify-center active:scale-90 group"
                  >
                    <X size={20} className="group-hover:rotate-90 transition-transform duration-300" />
                  </button>
                </div>

                {/* Modal Content - Scrollable */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-8 md:p-12 min-h-0 custom-scrollbar">
                  <div className="max-w-5xl mx-auto">
                    <VPNTools isModal={true} />
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default VPNToolsModal;
