from genericpath import isdir
import os
from torch_opstractor import BinaryReader, OpNode
from typing import List
import argparse
from azure.kusto.data import KustoConnectionStringBuilder, KustoClient
from azure.kusto.ingest import (
    QueuedIngestClient,
    IngestionProperties,
    DataFormat
)
import pandas
import glob

parser = argparse.ArgumentParser(prog="Torch Opstractor Data Uploader",
                                 description="Parses output files from opstractor and uploads them to Azure Data Explorer.")
parser.add_argument("--path", type=str, help="Path containing data files",
                    default="./profiles")
parser.add_argument("--cluster", type=str,
                    help="Azure Data Explorer Cluster Name", required=True)
parser.add_argument("--database", type=str,
                    help="Azure Data Explorer database name", default="pytorch_ops")
parser.add_argument("--client_id", type=str,
                    help="ClientId to use to connect to database", required=True)
parser.add_argument("--client_secret", type=str,
                    help="Client secret to use to connect to database", required=True)
parser.add_argument("--tenant_id", type=str,
                    help="Tenant to use for authentication", required=True)

args = parser.parse_args()

files_to_parse = []
if not os.path.exists(args.path):
    raise Exception("Invalid path {path}")
elif os.path.isdir(args.path):
    files_to_parse = glob.glob(os.path.join(
        args.path, "*.bin"), recursive=True)
else:
    files_to_parse.append(args.path)

ingest_cluster = f"https://ingest-{args.cluster}.kusto.windows.net"

kcsb_ingest = KustoConnectionStringBuilder.with_aad_application_key_authentication(
    ingest_cluster, args.client_id, args.client_secret, args.tenant_id)

ingestion_client = QueuedIngestClient(kcsb_ingest)

cluster = f"https://{args.cluster}.kusto.windows.net"
kcsb = KustoConnectionStringBuilder.with_aad_application_key_authentication(
    cluster, args.client_id, args.client_secret, args.tenant_id)

mgmt_client = KustoClient(kcsb)

# create table
query = ".create table ModelOps (ModelName:string, OpHandle: int, OpName:string, OpSchema:string, InvocationCount:int, TotalDurationInNs:long, NumberChildren:int, ChildrenDurationInNs: long, ParentOpHandle: int, SequenceId: int)"
mgmt_client.execute_mgmt(args.database, query)

# reduce batch time span
query = ".alter table ModelOps policy  ingestionbatching '{\"MaximumBatchingTimeSpan\": \"00:00:30\"}'"
mgmt_client.execute_mgmt(args.database, query)

ingestion_props = IngestionProperties(
    database=args.database,
    table="ModelOps",
    data_format=DataFormat.CSV
    # in case status update for success are also required
    # report_level=ReportLevel.FailuresAndSuccesses,
    # in case a mapping is required
    # ingestion_mapping_reference="{json_mapping_that_already_exists_on_table}"
    # ingestion_mapping_type=IngestionMappingType.JSON
)

fields = ["ModelName", "OpHandle", "OpName", "OpSchema", "InvocationCount",
          "TotalDurationInNs", "NumberChildren", "ChildrenDurationInNs", "ParentOpHandle", "SequenceId"]


def processChildren(root: OpNode, rows: List[OpNode], sequence_id: int):
    for opNode in root.children:
        children_total_duration_ms = sum(
            [x.cuml_total_duration_ns for x in opNode.children])
        row = [model, opNode.op.handle, opNode.op.name, opNode.op.schema, opNode.invocation_count,
               opNode.cuml_total_duration_ns, len(
                   opNode.children), children_total_duration_ms,
               (opNode.parent.op.handle if opNode.parent != None else None),
               sequence_id]
        rows.append(row)
        sequence_id += 1
        processChildren(opNode, rows, sequence_id)

    return sequence_id


for f in files_to_parse:
    print(f'Working on model {f}')
    rows = []
    reader = BinaryReader(open(f, mode="rb"))
    model = os.path.basename(f).replace('.bin', '')
    root = reader.read_op_node()
    sequence_id = 0

    processChildren(root, rows, sequence_id)

    if len(rows) > 0:
        query = f'.show table ModelOps extents where tags has "drop-by:{model}"'
        response = mgmt_client.execute_mgmt(args.database, query)

        for existing in response.primary_results[0]:
            print(
                f"Dropping extent {existing['ExtentId']} with rows {existing['RowCount']}")
            query = f".drop extent {existing['ExtentId']} from ModelOps"
            mgmt_client.execute_mgmt(args.database, query)

        print(f'Sending {len(rows)} rows to Azure Data Explorer')
        df = pandas.DataFrame(data=rows, columns=fields)
        ingestion_props.drop_by_tags = [model]
        ingestion_client.ingest_from_dataframe(
            df, ingestion_properties=ingestion_props)

    reader.close()
