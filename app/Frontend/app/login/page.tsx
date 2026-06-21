import { DecorativePanel } from "@/components/login/DecorativePanel"
import { LoginCard } from "@/components/login/LoginCard"

export default function LoginPage() {
  return (
    <div className="relative flex h-screen overflow-hidden bg-gray-50">
      <div className="relative z-10 flex w-full">
        <div className="hidden lg:flex lg:w-1/2">
          <DecorativePanel />
        </div>
        <div className="flex w-full items-center justify-center bg-bg-main[#F4F7F9] lg:w-1/2">
          <LoginCard />
        </div>
      </div>
    </div>
  )
}
