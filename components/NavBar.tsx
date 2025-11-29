"use client"
import { usePathname } from "next/navigation";
import Logo from "./logo";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "./ui/button";
import { ThemeProvider } from "next-themes";
import { SignOutButton, UserButton } from "@clerk/nextjs";
import { ThemeSwitcherBtn } from "./ThemeSwitcherBtn";
import { Menu, User, Bot } from "lucide-react"; // ⬅️ added Bot
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";

function Navbar() {
  return (
    <>
      <DesktopNavbar />
      <MobileNavbar />
    </>
  )
}

const items = [
  { label: "Dashboard", link: "/", icon: undefined },
  { label: "Transactions", link: "/transaction", icon: undefined },
  { label: "Chat" , link: "/chat", icon: <Bot className="w-5 h-5" /> },
]

function DesktopNavbar() {
  return (
    <div className="hidden border-separate border-b bg-background md:block">
      <nav className="container flex items-center justify-between px-8">
        <div className="flex h-[80px] min-h-[60px] items-center gap-x-4">
          <Logo />
          <div className="flex h-full">
            {items.map((item) => (
              <NavbarItem
                key={item.label}
                label={item.label}
                link={item.link}
                icon={item.icon}
              />
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          

          <ThemeSwitcherBtn />
          <UserButton />
        </div>
      </nav>
    </div>
  )
}

function MobileNavbar() {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="block border-separate bg-background md:hidden">
      <nav className="container flex items-center justify-between px-8">
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu />
            </Button>
          </SheetTrigger>
          <SheetContent className="w-[400px] sm:w-[540px]" side="left">
            <Logo />
            <div className="flex flex-col gap-1 pt-4">
              {items.map((item) => (
                <NavbarItem
                  key={item.label}
                  link={item.link}
                  label={item.label}
                  icon={item.icon}
                  onClick={() => setIsOpen((prev) => !prev)}
                />
              ))}
            </div>
          </SheetContent>
        </Sheet>
        <div className="flex h-[80px] min-h-[60px] items-center gap-x-4">
          <Logo />
        </div>
        <div className="flex items-center gap-2">
          {/* ⬇️ AI icon button for mobile */}
          <Link href="/chat">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full border border-border hover:bg-blue-500/20 hover:text-blue-400"
              title="AI Assistant"
            >
              <Bot className="w-5 h-5" />
            </Button>
          </Link>

          <ThemeSwitcherBtn />
          <UserButton />
        </div>
      </nav>
    </div>
  )
}

function NavbarItem({ label, link, icon, onClick }: {
  label: string;
  link: string;
  onClick?: () => void;
  icon: any
}) {
  const pathName = usePathname();
  const isActive = pathName === link;
  return (
    <div className="relative flex items-center">
      <Link href={link} className={cn(
        buttonVariants({ variant: "ghost" }),
        "w-full justify-start text-lg text-muted-foreground hover:text-foreground",
        isActive && "text-foreground"
      )}
        onClick={() => {
          if (onClick) onClick();
        }}
      >
        {label}
        {icon}
      </Link>
      {isActive && (
        <div
          className="absolute -bottom-[2px] left-1/2 hidden h-[2px] w-[80%] -translate-x-1/2 rounded-xl
                bg-foreground md:block"
        />
      )}
    </div>
  )
}

export default Navbar;
