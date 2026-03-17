import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Props = { title: string };

const AccountPlaceholder = ({ title }: Props) => (
  <div className="min-h-screen bg-[#f5f5f5] p-6">
    <Card className="max-w-2xl border border-gray-200 bg-white shadow-sm">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">This section is coming soon.</p>
      </CardContent>
    </Card>
  </div>
);
export default AccountPlaceholder;
