import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const AccountIntegrations = () => {
  return (
    <div className="bg-[#f8f8f6] px-7 py-10">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-10 text-[3.2rem] font-bold tracking-[-0.04em] text-[#111111]">Integrations</h1>

        <Card className="rounded-2xl border border-[#d7d7d2] bg-white shadow-none">
          <CardContent className="grid grid-cols-[140px_1fr_auto] items-center gap-5 p-5">
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#44c4e7]/15 text-sm font-semibold text-[#1e9cc0]">
                X
              </div>
              <span className="text-[1.15rem] font-medium text-[#232323]">Xero</span>
            </div>
            <div className="text-[1.05rem] text-[#7b7b7b]">
              Automatically sync your activity for all currencies to Xero.
            </div>
            <Button
              variant="outline"
              className="rounded-full border-[#7ae3cb] bg-white px-7 text-[1rem] font-semibold text-[#232323] hover:bg-[#f3fdf9]"
            >
              Connect
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AccountIntegrations;
