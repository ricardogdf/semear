"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

const Modal = Dialog.Root;

const ModalPortal = ({ children }: { children: React.ReactNode }) => (
  <Dialog.Portal>{children}</Dialog.Portal>
);

const ModalOverlay = React.forwardRef<
  React.ElementRef<typeof Dialog.Overlay>,
  React.ComponentPropsWithoutRef<typeof Dialog.Overlay>
>(({ className, ...props }, ref) => (
  <Dialog.Overlay
    ref={ref}
    className={cn("fixed inset-0 z-50 bg-black/50 backdrop-blur-sm", className)}
    {...props}
  />
));

const ModalContent = React.forwardRef<
  React.ElementRef<typeof Dialog.Content>,
  React.ComponentPropsWithoutRef<typeof Dialog.Content>
>(({ className, children, ...props }, ref) => (
  <ModalPortal>
    <ModalOverlay />
    <Dialog.Content
      ref={ref}
      className={cn(
        "fixed left-1/2 top-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[min(calc(100vw-2rem),32rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[28px] border border-border bg-card p-5 shadow-2xl focus:outline-none sm:p-6",
        className,
      )}
      {...props}
    >
      {children}
      <Dialog.Close
        className="absolute right-3 top-3 rounded-full p-2.5 text-muted-foreground transition hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Fechar modal"
      >
        <X className="h-4 w-4" />
      </Dialog.Close>
    </Dialog.Content>
  </ModalPortal>
));

/** Painel lateral (drawer) para navegação em telas pequenas. */
const SheetContent = React.forwardRef<
  React.ElementRef<typeof Dialog.Content>,
  React.ComponentPropsWithoutRef<typeof Dialog.Content>
>(({ className, children, ...props }, ref) => (
  <ModalPortal>
    <ModalOverlay />
    <Dialog.Content
      ref={ref}
      className={cn(
        "fixed inset-y-0 left-0 z-50 flex h-[100dvh] w-[min(85vw,20rem)] flex-col overflow-y-auto border-r border-border bg-card shadow-2xl focus:outline-none",
        className,
      )}
      {...props}
    >
      {children}
      <Dialog.Close
        className="absolute right-3 top-3 rounded-full p-2.5 text-muted-foreground transition hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Fechar menu"
      >
        <X className="h-5 w-5" />
      </Dialog.Close>
    </Dialog.Content>
  </ModalPortal>
));
SheetContent.displayName = "SheetContent";

const ModalTitle = React.forwardRef<
  React.ElementRef<typeof Dialog.Title>,
  React.ComponentPropsWithoutRef<typeof Dialog.Title>
>(({ className, ...props }, ref) => (
  <Dialog.Title
    ref={ref}
    className={cn("text-lg font-semibold", className)}
    {...props}
  />
));

const ModalDescription = React.forwardRef<
  React.ElementRef<typeof Dialog.Description>,
  React.ComponentPropsWithoutRef<typeof Dialog.Description>
>(({ className, ...props }, ref) => (
  <Dialog.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));

ModalOverlay.displayName = "ModalOverlay";
ModalContent.displayName = "ModalContent";
ModalTitle.displayName = "ModalTitle";
ModalDescription.displayName = "ModalDescription";

export { Modal, ModalContent, ModalDescription, ModalTitle, SheetContent };
