"use client"

import {Button as ButtonPrimitive} from "@base-ui/react/button"
import {type VariantProps} from "class-variance-authority"

import {cn} from "@/lib/utils"
import {useDisabledFieldset} from "@/components/ui/disabled-fieldset"

import {buttonVariants} from "@/components/ui/button-variants"

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  const disabled = useDisabledFieldset(props.disabled)
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
      disabled={disabled}
    />
  )
}

export { Button, buttonVariants }
