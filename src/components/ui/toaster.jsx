import { Toaster as Sonner } from "sonner"

export function Toaster() {
  return (
    <Sonner
      position="top-right"
      toastOptions={{
        classNames: {
          error: "bg-red-50 text-red-900 border-red-200",
          success: "bg-green-50 text-green-900 border-green-200",
          warning: "bg-amber-50 text-amber-900 border-amber-200",
          info: "bg-blue-50 text-blue-900 border-blue-200",
        },
      }}
    />
  )
}