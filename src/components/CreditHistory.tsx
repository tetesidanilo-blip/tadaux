import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowUpDown, Filter, History } from "lucide-react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { it } from "date-fns/locale";

interface CreditHistoryProps {
  userId: string;
}

const ITEMS_PER_PAGE = 10;

const TRANSACTION_TYPES = [
  { value: "all", label: "Tutti" },
  { value: "profile_completion", label: "Completamento Profilo" },
  { value: "template_clone", label: "Clonazione Template" },
  { value: "template_publish", label: "Pubblicazione Template" },
  { value: "template_earned", label: "Guadagni Template" },
  { value: "purchase", label: "Acquisto" },
  { value: "refund", label: "Rimborso" },
];

const TIME_PERIODS = [
  { value: "all", label: "Tutti i periodi" },
  { value: "7days", label: "Ultimi 7 giorni" },
  { value: "30days", label: "Ultimi 30 giorni" },
  { value: "90days", label: "Ultimi 90 giorni" },
];

export const CreditHistory = ({ userId }: CreditHistoryProps) => {
  const [page, setPage] = useState(0);
  const [transactionType, setTransactionType] = useState("all");
  const [timePeriod, setTimePeriod] = useState("all");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const getDateFilter = () => {
    const now = new Date();
    switch (timePeriod) {
      case "7days":
        return startOfDay(subDays(now, 7));
      case "30days":
        return startOfDay(subDays(now, 30));
      case "90days":
        return startOfDay(subDays(now, 90));
      default:
        return null;
    }
  };

  const { data, isLoading } = useQuery({
    queryKey: ['credit-history', userId, page, transactionType, timePeriod, sortOrder],
    queryFn: async () => {
      let query = supabase
        .from('credit_transactions')
        .select('*', { count: 'exact' })
        .eq('user_id', userId);

      // Filter by transaction type
      if (transactionType !== 'all') {
        query = query.eq('transaction_type', transactionType);
      }

      // Filter by date
      const dateFilter = getDateFilter();
      if (dateFilter) {
        query = query.gte('created_at', dateFilter.toISOString());
      }

      // Sort and paginate
      query = query
        .order('created_at', { ascending: sortOrder === 'asc' })
        .range(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE - 1);

      const { data, error, count } = await query;
      
      if (error) throw error;
      return { transactions: data || [], count: count || 0 };
    },
    enabled: !!userId,
  });

  const totalPages = data ? Math.ceil(data.count / ITEMS_PER_PAGE) : 0;

  const getTransactionTypeLabel = (type: string) => {
    return TRANSACTION_TYPES.find(t => t.value === type)?.label || type;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Storico Crediti
            </CardTitle>
            <CardDescription>
              Tutte le tue transazioni crediti
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <Select value={transactionType} onValueChange={setTransactionType}>
              <SelectTrigger>
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Tipo transazione" />
              </SelectTrigger>
              <SelectContent>
                {TRANSACTION_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1">
            <Select value={timePeriod} onValueChange={setTimePeriod}>
              <SelectTrigger>
                <SelectValue placeholder="Periodo" />
              </SelectTrigger>
              <SelectContent>
                {TIME_PERIODS.map((period) => (
                  <SelectItem key={period.value} value={period.value}>
                    {period.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            variant="outline"
            size="default"
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
          >
            <ArrowUpDown className="h-4 w-4 mr-2" />
            {sortOrder === 'desc' ? 'Più recenti' : 'Più vecchi'}
          </Button>
        </div>

        {/* Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Descrizione</TableHead>
                <TableHead className="text-right">Importo</TableHead>
                <TableHead className="text-right">Saldo Dopo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <>
                  {[1, 2, 3].map((i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                    </TableRow>
                  ))}
                </>
              ) : data && data.transactions.length > 0 ? (
                data.transactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="font-medium">
                      {format(new Date(tx.created_at), 'dd MMM yyyy', { locale: it })}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {getTransactionTypeLabel(tx.transaction_type)}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {tx.description || 'N/A'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={tx.amount > 0 ? "default" : "secondary"}>
                        {tx.amount > 0 ? '+' : ''}{tx.amount}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {tx.balance_after}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Nessuna transazione trovata
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Pagina {page + 1} di {totalPages} ({data?.count || 0} transazioni totali)
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                Precedente
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => p + 1)}
                disabled={page >= totalPages - 1}
              >
                Successiva
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
