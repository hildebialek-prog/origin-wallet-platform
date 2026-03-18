import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ArrowUpDown, Globe, ChevronDown } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const AccountHeader = () => {
  const [lang] = useState("EN");
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const initial = user?.name?.charAt(0)?.toUpperCase()
    || user?.email?.charAt(0)?.toUpperCase()
    || "K";

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-4">
        <Button className="bg-green-600 hover:bg-green-700 text-white gap-2 shadow-sm">
          <ArrowUpDown className="w-4 h-4" />
          Move funds
        </Button>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-gray-200 bg-gray-50 text-sm font-medium cursor-pointer hover:bg-gray-100 transition-colors">
          <Globe className="w-4 h-4 text-gray-500" />
          {lang}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-gray-100 text-sm font-medium text-gray-700 transition-colors">
              <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center">
                <span className="text-green-700 text-sm font-semibold">{initial}</span>
              </div>
              <span>My account</span>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem className="cursor-pointer">Profile</DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer">Settings</DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer text-red-600"
              onClick={handleLogout}
            >
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default AccountHeader;
