"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";

import { cn } from "@semear/utils";

const Modal = Dialog.Root;
const ModalTrigger = Dialog.Trigger;
const ModalClose = Dialog.Close;

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
        "fixed left-1/2 top-1/2 z-50 w-[min(92vw,32rem)] -translate-x-1/2 -translate-y-1/2 rounded-[28px] border border-border bg-card p-6 shadow-2xl focus:outline-none",
        className,
      )}
      {...props}
    >
      {children}
      <Dialog.Close
        className="absolute right-4 top-4 rounded-full p-2 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
        aria-label="Fechar modal"
      >
        <X className="h-4 w-4" />
      </Dialog.Close>
    </Dialog.Content>
  </ModalPortal>
));

const ModalHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col gap-2", className)} {...props} />
);

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

export {
  Modal,
  ModalClose,
  ModalContent,
  ModalDescription,
  ModalHeader,
  ModalTitle,
  ModalTrigger,
};
